<script>

document.getElementById("loginForm").addEventListener("submit", async function(e) {

    e.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    if (!email || !password) {

        alert("Please enter email and password.");

        return;
    }

    try {

        const response = await fetch(
            "https://eduhub-backend-llwi.onrender.com/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        alert(data.message);

        if (data.success) {

            // Save logged-in user's email
            localStorage.setItem(
                "userEmail",
                email
            );

            window.location.href =
                "index.html";
        }

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        alert(
            "❌ Unable to connect to EduHub server."
        );
    }

});

</script>
