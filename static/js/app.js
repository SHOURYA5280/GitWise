const form = document.getElementById("planner-form");

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    const budget = document.getElementById("budget").value;
    const gifts = document.getElementById("gifts").value;
    const deadline = document.getElementById("deadline").value;

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

    document.getElementById("result").innerHTML = `
        <h3>Shopping Plan Created!</h3>
        <p>Budget: ₹${data.budget}</p>
        <p>Number of gifts: ${data.gifts}</p>
        <p>Deadline: ${data.deadline}</p>
    `;

});