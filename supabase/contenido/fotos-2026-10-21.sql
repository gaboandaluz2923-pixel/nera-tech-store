-- Fotos oficiales de 3 productos que no tenían (21 oct 2026). Supabase → SQL Editor → Run. No repite las que ya estén.
insert into public.imagenes (producto_id, url, alt, orden, principal)
select p.id, i.url, i.alt, i.orden, i.orden = 0
from (values
('insta360-bullet-time-accessory-bundle','/productos/insta360-bullet-time-accessory-bundle/1.webp','Insta360 Bullet Time Accessory Bundle, vista frontal del kit: palo selfie y mango-trípode',0),
('insta360-bullet-time-accessory-bundle','/productos/insta360-bullet-time-accessory-bundle/2.webp','Insta360 Bullet Time Accessory Bundle, kit en diagonal',1),
('anker-eufy-battery-doorbell-1080p-inalambrico','/productos/anker-eufy-battery-doorbell-1080p-inalambrico/1.webp','Timbre eufy 1080p a batería, vista frontal: timbre con video y timbre interior (chime)',0),
('anker-eufy-battery-doorbell-1080p-inalambrico','/productos/anker-eufy-battery-doorbell-1080p-inalambrico/2.webp','Timbre eufy 1080p a batería, timbre y chime en diagonal',1),
('anker-542-bio-nylon-usb-c-to-lightning-cable-3ft','/productos/anker-542-bio-nylon-usb-c-to-lightning-cable-3ft/1.webp','Cable Anker 542 USB-C a Lightning, vista frontal con conectores USB-C y Lightning',0),
('anker-542-bio-nylon-usb-c-to-lightning-cable-3ft','/productos/anker-542-bio-nylon-usb-c-to-lightning-cable-3ft/2.webp','Cable Anker 542 USB-C a Lightning, detalle de los conectores en diagonal',1)
) as i(slug, url, alt, orden)
join public.productos p on p.slug = i.slug
where not exists (select 1 from public.imagenes x where x.producto_id = p.id and x.url = i.url)
returning (select nombre from public.productos where id = producto_id) as producto, url;
