// ==========================================================================================
// AÇÃO NECESSÁRIA: Configure suas credenciais do Supabase para desenvolvimento local.
// 
// O erro de "tela branca" aconteceu porque o método anterior de usar variáveis de ambiente
// (import.meta.env) só funciona em ambientes de build como a Vercel ou com um servidor de
// desenvolvimento Vite rodando.
//
// Para consertar isso e fazer o app funcionar no seu computador, por favor,
// preencha as duas variáveis abaixo com suas chaves do Supabase.
//
// IMPORTANTE: Este método é APENAS para desenvolvimento. Na Vercel, as "Environment 
// Variables" que você configurou continuarão sendo usadas de forma segura.
// ==========================================================================================
const LOCAL_DEV_SUPABASE_URL = "https://plqzupgyvcfelpkmdabr.supabase.co";
const LOCAL_DEV_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscXp1cGd5dmNmZWxwa21kYWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTE4NzMsImV4cCI6MjA3NDU4Nzg3M30.kPFRmviwBa75kqDHjyf3a8HX7duxwSJAvRKZSDuKLI0";


// Esta lógica usa as variáveis de ambiente da Vercel/Vite quando o app está em produção/build
// e recorre às variáveis locais que você definiu acima para desenvolvimento.
// FIX: Removed the failing `vite/client` type reference. Cast `import.meta` to `any` to access
// Vite's `env` object without TypeScript errors.
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? LOCAL_DEV_SUPABASE_URL;
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? LOCAL_DEV_SUPABASE_ANON_KEY;


// ==========================================================================================
// URLs de Assets (Logomarca, etc.)
// Estes são os links públicos das suas imagens do Supabase Storage.
// ==========================================================================================
export const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/assets-publicos/logomarca.png`;
export const FACADE_URL = `${SUPABASE_URL}/storage/v1/object/public/assets-publicos/frente-loja.jpg`;