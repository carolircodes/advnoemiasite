import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth/guards";

export default async function TestClientPage() {
  console.log("[cliente.test] === INÍCIO DA PÁGINA DE TESTE ===");
  
  try {
    console.log("[cliente.test] Chamando requireProfile...");
    const profile = await requireProfile(["cliente"]);
    console.log("[cliente.test] Profile carregado:", {
      id: profile.id,
      email: profile.email,
      role: profile.role
    });

    if (!profile.first_login_completed_at) {
      console.log("[cliente.test] Redirecionando para primeiro acesso");
      redirect("/auth/primeiro-acesso");
    }

    console.log("[cliente.test] Renderizando página de teste...");
    
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>PÁGINA DE TESTE - CLIENTE</h1>
        <p>Seja bem-vindo, {profile.full_name || profile.email}!</p>
        <p>ID: {profile.id}</p>
        <p>Email: {profile.email}</p>
        <p>Role: {profile.role}</p>
        <p>First Login: {profile.first_login_completed_at || "Não concluído"}</p>
        <p>Is Active: {profile.is_active ? "Sim" : "Não"}</p>
        
        <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0", border: "1px solid #ccc" }}>
          <h2>DEBUG INFO</h2>
          <p>Esta é uma página de teste simplificada.</p>
          <p>Se você conseguir ver esta página, o problema está nos componentes complexos.</p>
        </div>
        
        <div style={{ marginTop: "20px" }}>
          <a href="/cliente" style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", textDecoration: "none" }}>
            Voltar para página original
          </a>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[cliente.test] ERRO:", error);
    
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", backgroundColor: "#ffebee" }}>
        <h1>ERRO NA PÁGINA DE TESTE</h1>
        <p>Erro: {error instanceof Error ? error.message : String(error)}</p>
        <pre style={{ backgroundColor: "#f5f5f5", padding: "10px" }}>
          {error instanceof Error ? error.stack : 'No stack available'}
        </pre>
      </div>
    );
  }
}
