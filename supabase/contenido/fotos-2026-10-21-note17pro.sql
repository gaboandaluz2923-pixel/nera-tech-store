-- Fotos oficiales del Xiaomi Redmi Note 17 Pro 5G (21 oct 2026). Supabase → SQL Editor → Run. No repite las que ya estén.
insert into public.imagenes (producto_id, url, alt, orden, principal)
select p.id, i.url, i.alt, i.orden, i.orden = 0
from (values
('xiaomi-redmi-note-17-pro-5g','/productos/xiaomi-redmi-note-17-pro-5g/1.webp','Xiaomi Redmi Note 17 Pro 5G negro, vista frontal y reverso',0),
('xiaomi-redmi-note-17-pro-5g','/productos/xiaomi-redmi-note-17-pro-5g/2.webp','Xiaomi Redmi Note 17 Pro 5G negro, pantalla en diagonal',1),
('xiaomi-redmi-note-17-pro-5g','/productos/xiaomi-redmi-note-17-pro-5g/3.webp','Xiaomi Redmi Note 17 Pro 5G negro, reverso con cámara de 50 MP',2),
('xiaomi-redmi-note-17-pro-5g','/productos/xiaomi-redmi-note-17-pro-5g/4.webp','Xiaomi Redmi Note 17 Pro 5G naranja (Satin Orange), reverso',3),
('xiaomi-redmi-note-17-pro-5g','/productos/xiaomi-redmi-note-17-pro-5g/5.webp','Xiaomi Redmi Note 17 Pro 5G negro, vista de lado',4)
) as i(slug, url, alt, orden)
join public.productos p on p.slug = i.slug
where not exists (select 1 from public.imagenes x where x.producto_id = p.id and x.url = i.url)
returning url;
