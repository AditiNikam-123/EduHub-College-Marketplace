const userEmail = localStorage.getItem("userEmail");


// Check login
if (!userEmail) {

    alert("Please login first.");

    window.location.href = "login.html";

}


// Load user profile
async function loadProfile() {

    try {

        const response = await fetch("http://localhost:5000/api/products");

        const products = await response.json();


        // Find user's products
        const myProducts = products.filter(
            product => product.sellerEmail === userEmail
        );


        // Display email
        document.getElementById("userEmail").innerText = userEmail;


        // Create name from seller data
        if (myProducts.length > 0) {

            document.getElementById("userName").innerText =
                myProducts[0].seller;

            document.getElementById("profileIcon").innerText =
                myProducts[0].seller.charAt(0).toUpperCase();

        } else {

            document.getElementById("userName").innerText =
                "EduHub User";

            document.getElementById("profileIcon").innerText =
                userEmail.charAt(0).toUpperCase();

        }


        displayMyProducts(myProducts);

    } catch (error) {

        console.error(error);

        document.getElementById("productsContainer").innerHTML =
            `<div class="empty">
                Unable to load your products.
            </div>`;

    }

}


// Display products
function displayMyProducts(products) {

    const container =
        document.getElementById("productsContainer");


    if (products.length === 0) {

        container.innerHTML = `
            <div class="empty">
                You haven't listed any products yet.
                <br><br>
                <a href="index.html">
                    Sell your first product
                </a>
            </div>
        `;

        return;

    }


    container.innerHTML = products.map(product => `

        <div class="product-card">

            <h3>${product.name}</h3>

            <p>
                Category: ${product.category}
            </p>

            <p>
                Market Price: ₹${product.marketPrice}
            </p>

            <p class="price">
                Selling Price: ₹${product.price}
            </p>

        </div>

    `).join("");

}


// Logout
function logout() {

    localStorage.removeItem("userEmail");

    alert("Logged out successfully!");

    window.location.href = "login.html";

}


// Start
loadProfile();