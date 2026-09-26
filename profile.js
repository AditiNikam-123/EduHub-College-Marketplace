const API = "https://eduhub-backend-llwi.onrender.com";

const userEmail = localStorage.getItem("userEmail");


// ================================
// CHECK LOGIN
// ================================

if (!userEmail) {
    alert("Please login first.");
    window.location.href = "login.html";
}


// ================================
// LOAD PROFILE
// ================================

async function loadProfile() {

    try {

        const response = await fetch(`${API}/api/products`);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const products = await response.json();


        // Find products listed by current user
        const myProducts = products.filter(product =>
            String(product.sellerEmail || product.seller || "")
                .toLowerCase() === userEmail.toLowerCase()
        );


        // Display email
        const emailElement =
            document.getElementById("userEmail");

        if (emailElement) {
            emailElement.innerText = userEmail;
        }


        // Get saved name
        const savedName =
            localStorage.getItem("userName");


        let userName = savedName || "EduHub User";


        // If name is available from product data
        if (myProducts.length > 0 && myProducts[0].seller) {
            userName = myProducts[0].seller;
        }


        // Display name
        const nameElement =
            document.getElementById("userName");

        if (nameElement) {
            nameElement.innerText = userName;
        }


        // Profile icon
        const profileIcon =
            document.getElementById("profileIcon");

        if (profileIcon) {

            profileIcon.innerText =
                userName.charAt(0).toUpperCase();

        }


        // Display user's products
        displayMyProducts(myProducts);


        // Load statistics
        await loadStats();

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

        const container =
            document.getElementById(
                "productsContainer"
            );

        if (container) {

            container.innerHTML = `
                <div class="empty">
                    Unable to load your products.
                </div>
            `;

        }

    }

}


// ================================
// LOAD STATISTICS
// ================================

async function loadStats() {

    try {

        // Transactions
        const transactionResponse =
            await fetch(
                `${API}/api/transactions?email=${encodeURIComponent(userEmail)}`
            );


        if (transactionResponse.ok) {

            const transactions =
                await transactionResponse.json();


            const transactionCount =
                document.getElementById(
                    "transactionCount"
                );


            if (transactionCount) {

                transactionCount.innerText =
                    Array.isArray(transactions)
                        ? transactions.length
                        : 0;

            }

        }


        // Messages
        const messageResponse =
            await fetch(
                `${API}/api/messages?email=${encodeURIComponent(userEmail)}`
            );


        if (messageResponse.ok) {

            const messages =
                await messageResponse.json();


            const messageCount =
                document.getElementById(
                    "messageCount"
                );


            if (messageCount) {

                messageCount.innerText =
                    Array.isArray(messages)
                        ? messages.length
                        : 0;

            }

        }

    } catch (error) {

        console.error(
            "Stats loading error:",
            error
        );

    }

}


// ================================
// DISPLAY MY PRODUCTS
// ================================

function displayMyProducts(products) {

    const container =
        document.getElementById(
            "productsContainer"
        );


    if (!container) return;


    if (!products || products.length === 0) {

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


    container.innerHTML =
        products.map(product => {

            const sellingPrice =
                product.sellingPrice ??
                product.price ??
                0;


            const marketPrice =
                product.marketPrice ??
                0;


            const isSold =
                product.available === false;


            return `

                <div class="product-card">

                    <h3>
                        ${escapeHTML(
                            product.name ||
                            "Product"
                        )}
                    </h3>


                    <p>
                        📂 Category:
                        ${escapeHTML(
                            product.category ||
                            "N/A"
                        )}
                    </p>


                    <p>
                        💰 Market Price:
                        ₹${escapeHTML(
                            marketPrice
                        )}
                    </p>


                    <p class="price">
                        🏷️ Selling Price:
                        ₹${escapeHTML(
                            sellingPrice
                        )}
                    </p>


                    <p>
                        📌 Status:

                        <strong
                            style="
                                color:${
                                    isSold
                                        ? "#dc2626"
                                        : "#15803d"
                                };
                            "
                        >
                            ${
                                isSold
                                    ? "Sold"
                                    : "Available"
                            }
                        </strong>

                    </p>

                </div>

            `;

        }).join("");

}


// ================================
// LOGOUT
// ================================

function logout() {

    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");

    alert("Logged out successfully!");

    window.location.href =
        "login.html";

}


// ================================
// ESCAPE HTML
// ================================

function escapeHTML(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}


// ================================
// START
// ================================

document.addEventListener(
    "DOMContentLoaded",
    loadProfile
);
