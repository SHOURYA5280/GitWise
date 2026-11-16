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