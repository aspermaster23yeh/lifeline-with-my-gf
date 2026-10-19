# Our Life Map

Un mapa del tiempo para dos personas. Los meses son columnas reales del calendario y los proyectos ocupan el periodo entre su fecha de inicio y su fecha objetivo.

## Cómo está armado

- Las fechas son la fuente de verdad. `src/lib/domain/timeline.ts` convierte una fecha a una coordenada horizontal y al revés. La fila vertical vive aparte, en `canvas_layouts`.
- El lienzo usa React Flow para arrastrar, redimensionar y conectar. Al soltar una tarjeta, el desplazamiento horizontal se traduce a meses de calendario y actualiza las fechas. Las tareas, las notas y el progreso se quedan.
- El progreso es `tareas completadas / tareas totales`. Un proyecto vencido no pasa solo a completado ni a cancelado.
- Deshacer y rehacer cubren las ediciones de esta sesión.
- Los datos pasan por un repositorio. Sin variables de Supabase, se usa un adaptador local en `localStorage`. Ese modo no sincroniza a otra persona y la interfaz lo dice.

## Modo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El ejemplo incluye proyectos, tareas y conexiones. “Pareja” es un participante de ejemplo, no una sesión en vivo.

## Supabase

Hace falta un proyecto de Supabase. No hay claves en este repositorio.

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. En Authentication, activa email y contraseña. Define la Site URL de la app para los correos de confirmación.
3. Copia `.env.example` a `.env.local` y llena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave publica>
```

La clave `anon` legacy también se acepta como `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No pongas la clave `service_role` en el cliente.

4. Aplica la migración `supabase/migrations/20261019000000_life_map.sql` con el CLI:

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

La migración crea las tablas, las políticas de Row Level Security y, si existe la publicación `supabase_realtime`, suscribe los cambios. En el dashboard, confirma que Realtime esté activo para `projects`, `tasks`, `project_connections`, `canvas_layouts`, `project_history` y `workspace_invitations`.

Con las variables presentes, la app pide cuenta. Quien crea la primera sesión obtiene un espacio. La otra persona entra con el correo invitado y abre `/invite/<token>`.

Los updates comparan `updated_at`. Si alguien más guardó esa fila, el mapa se recarga en lugar de pisar el cambio.

## Scripts

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Fuera de este MVP

Fotos, archivos, PDF, plantillas, recordatorios, estadísticas e inteligencia artificial no están en la interfaz. El esquema relacional deja sitio para sumarlos después sin convertir la app en un único JSON.
