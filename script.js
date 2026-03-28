const chatToggle = document.getElementById("chat-toggle");
const chatBox = document.getElementById("chat-box");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

if (chatToggle && chatBox && chatMessages && chatInput && chatSend) {
  chatToggle.addEventListener("click", () => {
    chatBox.classList.toggle("hidden");
  });

  function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    chatInput.value = "";

    addMessage("Digitando...", "bot");
    const typingMessage = chatMessages.lastChild;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      typingMessage.remove();

      addMessage(
        data.reply || "Desculpe, não consegui responder agora.",
        "bot"
      );
    } catch (error) {
      typingMessage.remove();
      addMessage("Erro ao conectar com a assistente.", "bot");
    }
  }

  chatSend.addEventListener("click", sendMessage);

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}