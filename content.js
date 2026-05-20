console.log("Dinero content script loaded");

let dineroPopupShown = false;

function getEstimatedPriceFromPage() {
  const lines = document.body.innerText
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const totalKeywords = [
    "estimated total",
    "order total",
    "grand total",
    "subtotal",
    "total"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    if (totalKeywords.some(keyword => line.includes(keyword))) {
      const nearbyText = lines.slice(i, i + 6).join(" ");
      const priceMatches = nearbyText.match(/\$\s?\d+(,\d{3})*(\.\d{2})?/g);

      if (priceMatches && priceMatches.length > 0) {
        const prices = priceMatches
          .map(price => parseFloat(price.replace("$", "").replace(",", "").trim()))
          .filter(price => price >= 5 && price < 10000);

        if (prices.length > 0) return Math.max(...prices);
      }
    }
  }

  return null;
}

function generateMessage(userData, price) {
  const goal = userData?.goal || "your savings goal";
  const trigger = userData?.trigger || "impulse spending";

  if (price) {
    return `This purchase looks like about $${price}. You said you're saving for ${goal}. Do you still want to spend this right now?`;
  }

  return `Quick check: is this something you really want, or is this just a ${trigger} moment? You could put this toward ${goal} instead.`;
}

function createPopup(message) {
  if (document.getElementById("dinero-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "dinero-overlay";

  overlay.innerHTML = `
    <div id="dinero-modal">
      <h2>Wait a sec 👀</h2>
      <p>${message}</p>
      <p class="dinero-subtext">Dinero helps you pause before impulse spending.</p>
      <div class="dinero-buttons">
        <button id="dinero-save-instead">Save instead</button>
        <button id="dinero-buy-anyway">Buy anyway</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("dinero-save-instead").addEventListener("click", () => {
    alert("Nice. For the MVP, this would redirect the money to savings.");
    overlay.remove();
  });

  document.getElementById("dinero-buy-anyway").addEventListener("click", () => {
    overlay.remove();
  });
}

async function showDineroPopup() {
  if (dineroPopupShown) return;

  const result = await chrome.storage.local.get("dineroUserData");
  const userData = result.dineroUserData;

  if (!userData) {
    console.log("No Dinero user data found yet");
    return;
  }

  const price = getEstimatedPriceFromPage();
  const message = generateMessage(userData, price);

  createPopup(message);
  dineroPopupShown = true;
}

function isRealCheckoutOrCartPage() {
  const url = window.location.href.toLowerCase();

  const strongUrlSignals = [
    "/checkout",
    "checkout.",
    "checkout?",
    "/cart",
    "/basket",
    "/shopping-bag",
    "/shoppingcart",
    "/bag"
  ];

  return strongUrlSignals.some(signal => url.includes(signal));
}

function buttonLooksLikeCheckout(buttonText) {
  const text = buttonText.toLowerCase();

  const checkoutButtonWords = [
    "checkout",
    "proceed to checkout",
    "place order",
    "review order",
    "continue to payment",
    "buy now"
  ];

  return checkoutButtonWords.some(word => text.includes(word));
}

function attachCheckoutButtonListeners() {
  const buttons = document.querySelectorAll("button, a, input[type='button'], input[type='submit']");

  buttons.forEach(button => {
    const buttonText = button.innerText || button.value || "";

    if (buttonLooksLikeCheckout(buttonText)) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        showDineroPopup();
      });
    }
  });
}

// Only auto-show if the URL strongly looks like checkout/cart
setTimeout(() => {
  if (isRealCheckoutOrCartPage()) {
    showDineroPopup();
  }

  attachCheckoutButtonListeners();
}, 1500);

// Reattach listeners as sites dynamically load buttons
setInterval(attachCheckoutButtonListeners, 3000);