import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

// Enlace de pedidos hechos sin cuenta con la cuenta de Google del cliente.
//  - Por correo: todos los pedidos con el mismo correo (Google ya verificó que el correo es suyo).
//  - Por enlace privado: el pedido del enlace "Ver mi pedido" desde el que tocó "Guardá tus datos".
//  - Por número + teléfono: desde "Mis pedidos".
// Un cliente ya enlazado a otra cuenta nunca se cambia solo (eso lo hace el equipo desde el panel).

const correoVerificado = (u: User) =>
  u.email && (u.email_confirmed_at || u.app_metadata?.provider === "google") ? u.email.toLowerCase() : null;

export async function enlazarCuenta(usuario: User, tokenPedido?: string | null) {
  const sb = createServiceClient();
  const correo = correoVerificado(usuario);
  if (correo) {
    await sb.from("clientes").update({ auth_user_id: usuario.id }).eq("correo", correo).is("auth_user_id", null);
  }
  if (tokenPedido && /^[0-9a-f]{64}$/.test(tokenPedido)) {
    const { data: p } = await sb.from("pedidos").select("cliente_id").eq("token", tokenPedido).maybeSingle();
    if (p?.cliente_id) {
      await sb.from("clientes").update({ auth_user_id: usuario.id }).eq("id", p.cliente_id).is("auth_user_id", null);
    }
  }
}

export type PedidoDeCliente = {
  numero: number;
  token: string;
  estado: string;
  forma_pago: string;
  total: number;
  pagado_en: string | null;
  created_at: string;
  factura_estado: string;
  lineas_pedido: { nombre: string; cantidad: number }[];
};

export async function pedidosDeUsuario(usuarioId: string): Promise<PedidoDeCliente[]> {
  const sb = createServiceClient();
  const { data: clientes } = await sb.from("clientes").select("id").eq("auth_user_id", usuarioId);
  const ids = (clientes ?? []).map((c) => c.id as string);
  if (!ids.length) return [];
  const { data } = await sb
    .from("pedidos")
    .select("numero, token, estado, forma_pago, total, pagado_en, created_at, factura_estado, lineas_pedido(nombre, cantidad)")
    .in("cliente_id", ids)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as PedidoDeCliente[];
}

/** "¿Te falta un pedido?": lo agrega a la cuenta si número y teléfono coinciden. */
export async function reclamarPedido(usuarioId: string, numero: number, telefono: string) {
  const sb = createServiceClient();
  const { data: p } = await sb
    .from("pedidos")
    .select("cliente_id, clientes(auth_user_id)")
    .eq("numero", numero)
    .eq("entrega->>telefono", telefono)
    .maybeSingle();
  if (!p?.cliente_id) return { ok: false, mensaje: "No encontramos un pedido con ese número y ese teléfono." };
  const dueño = (p.clientes as unknown as { auth_user_id: string | null } | null)?.auth_user_id;
  if (dueño && dueño !== usuarioId) {
    return { ok: false, mensaje: "Ese pedido ya está en otra cuenta. Escribinos por WhatsApp y lo revisamos." };
  }
  await sb.from("clientes").update({ auth_user_id: usuarioId }).eq("id", p.cliente_id);
  return { ok: true, mensaje: `Listo: el pedido #${numero} ya está en tu cuenta.` };
}

// ---------------------------------------------------------------------------
// Mi cuenta
// ---------------------------------------------------------------------------
export type Direccion = {
  id: string;
  nombre: string;
  zona: string;
  departamento: string | null;
  municipio: string | null;
  direccion: string;
  referencia: string | null;
  principal: boolean;
};

export type Perfil = {
  id: string;
  nombre: string;
  telefono: string | null;
  telefono_alterno: string | null;
  correo: string | null;
  cumple_dia: number | null;
  cumple_mes: number | null;
  acepta_whatsapp: boolean;
  acepta_correo: boolean;
  direcciones: Direccion[];
};

const CAMPOS_PERFIL =
  "id, nombre, telefono, telefono_alterno, correo, cumple_dia, cumple_mes, acepta_whatsapp, acepta_correo, created_at, direcciones(id, nombre, zona, departamento, municipio, direccion, referencia, principal, created_at)";

/**
 * Perfil del cliente con sesión: el registro de cliente con su correo de Google (o el más antiguo enlazado).
 * Si todavía no tiene ninguno, se crea con su nombre y correo de Google.
 */
export async function perfilDeUsuario(usuario: User): Promise<Perfil> {
  const sb = createServiceClient();
  await enlazarCuenta(usuario);
  const correo = correoVerificado(usuario);
  const { data } = await sb
    .from("clientes")
    .select(CAMPOS_PERFIL)
    .eq("auth_user_id", usuario.id)
    .order("created_at", { ascending: true });
  type Fila = Perfil & { created_at: string; direcciones: (Direccion & { created_at: string })[] };
  const filas = (data ?? []) as unknown as Fila[];
  let fila = filas.find((f) => f.correo && f.correo === correo) ?? filas[0];

  if (!fila) {
    const nombre =
      String(usuario.user_metadata?.full_name ?? usuario.user_metadata?.name ?? "").trim() ||
      (usuario.email ?? "Cliente").split("@")[0];
    let { data: nuevo, error } = await sb
      .from("clientes")
      .insert({ nombre, correo, auth_user_id: usuario.id, origen: "google" })
      .select(CAMPOS_PERFIL)
      .single();
    // Si ese correo ya es de un cliente enlazado a otra cuenta, se crea el perfil sin correo
    if (error?.code === "23505") {
      ({ data: nuevo, error } = await sb
        .from("clientes")
        .insert({ nombre, auth_user_id: usuario.id, origen: "google" })
        .select(CAMPOS_PERFIL)
        .single());
    }
    if (error) throw error;
    fila = nuevo as unknown as Fila;
  }
  return {
    ...fila,
    direcciones: [...(fila.direcciones ?? [])].sort(
      (a, b) => Number(b.principal) - Number(a.principal) || a.created_at.localeCompare(b.created_at)
    ),
  };
}

/** Verifica que la dirección sea de alguno de los registros de cliente del usuario. */
export async function direccionDelUsuario(usuarioId: string, direccionId: string) {
  const sb = createServiceClient();
  const { data } = await sb
    .from("direcciones")
    .select("id, cliente_id, clientes!inner(auth_user_id)")
    .eq("id", direccionId)
    .eq("clientes.auth_user_id", usuarioId)
    .maybeSingle();
  return data ? (data.cliente_id as string) : null;
}
