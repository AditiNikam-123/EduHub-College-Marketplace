```js
const buyer = localStorage.getItem("userEmail");

const transactionList =
    document.getElementById("transactionList");


if (!buyer) {

    transactionList.innerHTML = `
        <div class="empty-message">
            <h2>🔐 Login Required</h2>
            <p>Please login to view your transaction history.</p>
            <a href="login.html">Login</a>
        </div>
    `;

} else {

    fetch("https://eduhub-backend-llwi.onrender.com/api/transactions")

        .then(response => {

            if (!response.ok) {
                throw new Error("Failed to load transactions");
            }

            return response.json();

        })

        .then(transactions => {

            // Show only transactions of the current buyer
            const myTransactions =
                transactions.filter(transaction =>
                    String(transaction.buyer || "").toLowerCase() ===
                    String(buyer).toLowerCase()
                );


            if (myTransactions.length === 0) {

                transactionList.innerHTML = `
                    <div class="empty-message">
                        <h2>🛍️ No Transactions Yet</h2>
                        <p>
                            Your purchases will appear here.
                        </p>
                        <a href="index.html">
                            Explore Marketplace
                        </a>
                    </div>
                `;

                return;
            }


            transactionList.innerHTML = "";


            myTransactions.reverse().forEach(transaction => {

                const card =
                    document.createElement("div");

                card.className =
                    "transaction-card";


                card.innerHTML = `

                    <h3>
                        📦
                        ${transaction.productName || "Product"}
                    </h3>

                    <p class="transaction-info">
                        <strong>💰 Amount:</strong>
                        ₹${transaction.amount || 0}
                    </p>

                    <p class="transaction-info">
                        <strong>📅 Date:</strong>
                        ${transaction.date || ""}
                    </p>

                    <p class="transaction-info">
                        <strong>👤 Seller:</strong>
                        ${transaction.seller || "N/A"}
                    </p>

                    <p class="transaction-info">
                        <strong>📌 Status:</strong>

                        <span class="status">
                            ✓ ${transaction.status || "Completed"}
                        </span>
                    </p>

                    <p class="transaction-id">
                        Transaction ID:
                        ${transaction.id}
                    </p>

                `;


                transactionList.appendChild(card);

            });

        })

        .catch(error => {

            console.error(
                "Transaction history error:",
                error
            );


            transactionList.innerHTML = `
                <div class="empty-message">

                    <h2>⚠️ Unable to Load</h2>

                    <p>
                        We couldn't load your transaction history.
                    </p>

                    <p>
                        Please try again in a few seconds.
                    </p>

                </div>
            `;

        });

}
```
