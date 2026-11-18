import {
    auth
} from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

const form = document.getElementById("planner-form");
const result = document.getElementById("result");


// Prevent selection of past dates
const deadlineInput = document.getElementById("deadline");

function setMinimumDate() {

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const minimumDate = `${year}-${month}-${day}`;

    deadlineInput.min = minimumDate;

}

setMinimumDate();

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    const budget = document.getElementById("budget").value;
    const gifts = document.getElementById("gifts").value;
    const deadline = document.getElementById("deadline").value;

    result.innerHTML = "<p>Creating your shopping plan...</p>";

    try {

        // Create shopping plan
        const response = await fetch("/create-plan", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                budget: budget,
                gifts: gifts,
                deadline: deadline
            })

        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not create plan");
        }

        // Retrieve saved shopping plan
        const planResponse = await fetch(`/plan/${data.plan_id}`);

        const planData = await planResponse.json();

        if (!planResponse.ok) {
            throw new Error(planData.error || "Could not retrieve plan");
        }

        displayDashboard(planData);

    }

    catch (error) {

        result.innerHTML = `<p>${error.message}</p>`;

    }

});


function displayDashboard(data) {

    const plan = data.plan;
    const gifts = data.gifts;

    const totalBudget = Number(plan.total_budget);

    const allocatedBudget = gifts.reduce(
        (total, gift) => total + Number(gift.allocated_budget), 0
    );

    const spentAmount = gifts.reduce(
        (total, gift) => total + Number(gift.spent_amount), 0
    );

    const remainingBalance = totalBudget - spentAmount;
    const unallocatedBudget = totalBudget - allocatedBudget;

    result.innerHTML = `

        <section class="dashboard">

            <h2>Your Shopping Dashboard</h2>

            <div class="budget-overview">

                <div class="budget-card">
                    <h3>Total Budget</h3>
                    <p>₹${totalBudget.toLocaleString("en-IN")}</p>
                </div>

                <div class="budget-card">
                    <h3>Allocated Budget</h3>
                    <p>₹${allocatedBudget.toLocaleString("en-IN")}</p>
                </div>

                <div class="budget-card">
                    <h3>Amount Spent</h3>
                    <p>₹${spentAmount.toLocaleString("en-IN")}</p>
                </div>

                <div class="budget-card">
                    <h3>Unallocated Budget</h3>
                    <p>₹${unallocatedBudget.toLocaleString("en-IN")}</p>
                </div>

                <div class="budget-card">
                    <h3>Remaining Balance</h3>
                    <p>₹${remainingBalance.toLocaleString("en-IN")}</p>
                </div>

            </div>

            <h3 class="gift-heading">Edit Your Gift Allocations</h3>

            <form id="allocations-form">

                <div class="gift-list">

                    ${gifts.map(gift => `

                        <div class="gift-card">

                            <h4>${gift.gift_name}</h4>

                            <p>
                                Spent:
                                ₹${Number(gift.spent_amount).toLocaleString("en-IN")}
                            </p>

                            <label for="gift-${gift.id}">
                                Allocated Budget (₹)
                            </label>

                            <input
                                type="number"
                                id="gift-${gift.id}"
                                class="allocation-input"
                                data-gift-id="${gift.id}"
                                value="${gift.allocated_budget}"
                                min="0"
                                step="0.01"
                                required
                            >

                            <p>Status: ${gift.status}</p>

                        </div>

                    `).join("")}

                </div>

                <button type="submit" class="primary-btn save-allocation-btn">
                    Save Allocations
                </button>

                <p id="allocation-message"></p>

            </form>

        </section>

    `;


    // Handle allocation updates

    const allocationForm = document.getElementById("allocations-form");

    allocationForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const inputs = document.querySelectorAll(".allocation-input");

        const allocations = [];

        for (const input of inputs) {

            const amount = Number(input.value);

            if (!Number.isFinite(amount) || amount < 0) {

                document.getElementById("allocation-message").textContent =
                    "Please enter valid allocation amounts.";

                return;

            }

            allocations.push({

                id: Number(input.dataset.giftId),

                allocated_budget: amount

            });

        }

        const message = document.getElementById("allocation-message");

        message.textContent = "Saving allocations...";

        try {

            const response = await fetch(
                `/plan/${plan.id}/allocations`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        allocations: allocations
                    })

                }
            );

            const updateData = await response.json();

            if (!response.ok) {
                throw new Error(updateData.error || "Could not update allocations");
            }

            // Retrieve updated information from database

            const updatedResponse = await fetch(`/plan/${plan.id}`);

            const updatedData = await updatedResponse.json();

            if (!updatedResponse.ok) {
                throw new Error("Could not refresh dashboard");
            }

            displayDashboard(updatedData);

            document.getElementById("allocation-message").textContent =
                "Allocations saved successfully!";

        }

        catch (error) {

            message.textContent = error.message;

        }

    });

}

const productSearchForm = document.getElementById("product-search-form");
const productResults = document.getElementById("product-results");

productSearchForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const query = document.getElementById("product-query").value.trim();

    if (!query) {
        productResults.textContent = "Please enter a product name.";
        return;
    }

    productResults.innerHTML = "<p>Searching products...</p>";

    try {

        const response = await fetch(
            `/search-products?query=${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        if (data.products.length === 0) {
            productResults.innerHTML = "<p>No matching products found.</p>";
            return;
        }

        productResults.innerHTML = `
            <p class="demo-notice">
                ${data.source}
            </p>

            <div class="product-list">

                ${data.products.map(product => `
                    <div class="product-card">

                        <h3>${product.name}</h3>

                        <p>Price: ₹${product.price.toLocaleString("en-IN")}</p>

                        <p>Marketplace: ${product.marketplace}</p>

                        <p>Availability: ${product.availability}</p>

                    </div>
                `).join("")}

            </div>
        `;

    }
    catch (error) {

        productResults.textContent = error.message;

    }

});

// ===============================
// Firebase Authentication
// ===============================

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");

const authMessage = document.getElementById("auth-message");
const accountStatus = document.getElementById("account-status");
const loggedInUser = document.getElementById("logged-in-user");

const logoutBtn = document.getElementById("logout-btn");


// Display authentication messages
function showAuthMessage(message) {
    authMessage.textContent = message;
}


// Create Account
signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    if (password !== confirmPassword) {
        showAuthMessage("Passwords do not match.");
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);

        showAuthMessage("Account created successfully!");

        signupForm.reset();

    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            showAuthMessage("This email is already registered.");
        } else if (error.code === "auth/weak-password") {
            showAuthMessage("Please choose a stronger password.");
        } else if (error.code === "auth/invalid-email") {
            showAuthMessage("Please enter a valid email address.");
        } else {
            showAuthMessage("Unable to create account. Please try again.");
            console.error(error);
        }
    }
});


// Log In
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);

        showAuthMessage("Logged in successfully!");

        loginForm.reset();

    } catch (error) {
        if (error.code === "auth/invalid-credential") {
            showAuthMessage("Incorrect email or password.");
        } else if (error.code === "auth/too-many-requests") {
            showAuthMessage("Too many attempts. Please try again later.");
        } else {
            showAuthMessage("Unable to log in. Please try again.");
            console.error(error);
        }
    }
});


// Track Login Status
onAuthStateChanged(auth, function (user) {

    // Authentication Form Switching

const signupBtn = document.getElementById("show-signup-btn");
const loginBtn = document.getElementById("show-login-btn");

const accountHeading = document.getElementById("account-heading");
const accountDescription = document.getElementById("account-description");

const authToggle = document.querySelector(".auth-toggle");


// Show Sign Up Form
signupBtn.addEventListener("click", function () {
    signupForm.hidden = false;
    loginForm.hidden = true;

    signupBtn.classList.add("primary-btn");
    loginBtn.classList.remove("primary-btn");

    showAuthMessage("");
});


// Show Log In Form
loginBtn.addEventListener("click", function () {
    signupForm.hidden = true;
    loginForm.hidden = false;

    loginBtn.classList.add("primary-btn");
    signupBtn.classList.remove("primary-btn");

    showAuthMessage("");
});


// Track Login Status
onAuthStateChanged(auth, function (user) {

    if (user) {
        signupForm.hidden = true;
        loginForm.hidden = true;

        authToggle.hidden = true;
        accountHeading.hidden = true;
        accountDescription.hidden = true;
        authMessage.hidden = true;

        accountStatus.hidden = false;

        loggedInUser.textContent = "Logged in as: " + user.email;

    } else {
        signupForm.hidden = false;
        loginForm.hidden = true;

        authToggle.hidden = false;
        accountHeading.hidden = false;
        accountDescription.hidden = false;
        authMessage.hidden = false;

        accountStatus.hidden = true;

        signupBtn.classList.add("primary-btn");
        loginBtn.classList.remove("primary-btn");
    }

});
});


// Log Out
logoutBtn.addEventListener("click", async function () {

    try {
        await signOut(auth);

        showAuthMessage("You have logged out successfully.");

    } catch (error) {
        showAuthMessage("Unable to log out. Please try again.");
        console.error(error);
    }

});