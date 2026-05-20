const form = document.getElementById("onboarding-form");
const status = document.getElementById("status");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const userData = {
    budget: document.getElementById("budget").value,
    category: document.getElementById("category").value,
    goal: document.getElementById("goal").value,
    treat: document.getElementById("treat").value,
    trigger: document.getElementById("trigger").value
  };

  chrome.storage.local.set({ dineroUserData: userData }, function () {
    status.textContent = "Preferences saved!";
    console.log("Saved Dinero preferences:", userData);
  });
});