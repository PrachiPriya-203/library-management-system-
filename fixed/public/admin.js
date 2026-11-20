const API = "";

// Apply saved theme
if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
}

const user = JSON.parse(sessionStorage.getItem("user"));

if (!user) window.location.href = "login.html";
if (user && user.role !== "admin") window.location.href = "student.html";

// 🔔 TOAST
function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

// 🚪 LOGOUT
function logout() {
    sessionStorage.removeItem("user");
    window.location.href = "login.html";
}

// 🌙 DARK / LIGHT TOGGLE
function toggleDark() {
    document.body.classList.toggle("light");

    if (document.body.classList.contains("light")) {
        localStorage.setItem("theme", "light");
    } else {
        localStorage.setItem("theme", "dark");
    }
}

// 🔁 SECTION SWITCH
function showSection(id, el) {
    document.querySelectorAll(".section").forEach(sec => {
        sec.style.display = "none";
    });

    const target = document.getElementById(id);
    if (target) target.style.display = "block";

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    if (el) el.classList.add("active");

    // Load relevant data when section is shown
    if (id === "students") loadStudents();
    if (id === "issued") loadIssued();
    if (id === "requests") loadRequests();
}

// INPUT CACHE
const titleEl = document.getElementById("title");
const authorEl = document.getElementById("author");
const deptEl = document.getElementById("dept");
const qtyEl = document.getElementById("qty");

// ================= EDIT MODAL =================
let currentEditId = null;

function editBook(id, title, author, dept, qty) {
    currentEditId = id;

    document.getElementById("editTitle").value = title;
    document.getElementById("editAuthor").value = author;
    document.getElementById("editDept").value = dept;
    document.getElementById("editQty").value = qty;

    document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("editModal").style.display = "none";
}

async function updateBook() {
    const title = document.getElementById("editTitle").value.trim();
    const author = document.getElementById("editAuthor").value.trim();
    const dept = document.getElementById("editDept").value.trim();
    const qty = document.getElementById("editQty").value.trim();

    if (!title || !author || !dept || !qty) {
        return toast("Fill all fields ⚠️");
    }

    try {
        const res = await fetch(`${API}/edit/${currentEditId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, author, dept, qty })
        });

        if (!res.ok) throw new Error("Update failed");

        toast("Book Updated ✏️");
        closeModal();
        loadBooks();
    } catch (err) {
        console.error("updateBook error:", err);
        toast("Failed to update book ⚠️");
    }
}

// ================= ADD BOOK =================
async function addBook() {
    const title = titleEl.value.trim();
    const author = authorEl.value.trim();
    const dept = deptEl.value.trim();
    const qty = qtyEl.value.trim();

    if (!title || !author || !dept || !qty) {
        return toast("Fill all fields ⚠️");
    }

    try {
        const res = await fetch(`${API}/addBook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, author, dept, qty })
        });

        if (!res.ok) throw new Error("Add failed");

        toast("Book Added 📚");
        titleEl.value = authorEl.value = deptEl.value = qtyEl.value = "";
        refreshAll();
    } catch (err) {
        console.error("addBook error:", err);
        toast("Failed to add book ⚠️");
    }
}

// ================= LOAD BOOKS =================
async function loadBooks() {
    try {
        let books = await (await fetch(`${API}/books`)).json();

        const search =
            document.getElementById("searchAdmin").value.toLowerCase() || "";
        const deptFilter =
            document.getElementById("filterDept").value.toLowerCase() || "";

        books = books.filter(b =>
            b.title.toLowerCase().includes(search) &&
            b.dept.toLowerCase().includes(deptFilter)
        );

        const div = document.getElementById("books");
        div.innerHTML = "";

        if (books.length === 0) {
            div.innerHTML = `<p>No books found 😕</p>`;
            return;
        }

        books.forEach(b => {
            // Escape single quotes in fields to prevent broken onclick attributes
            const safeTitle = (b.title || "").replace(/'/g, "&#39;");
            const safeAuthor = (b.author || "").replace(/'/g, "&#39;");
            const safeDept = (b.dept || "").replace(/'/g, "&#39;");

            div.innerHTML += `
            <div class="card">
                <h3>${b.title}</h3>
                <p>by ${b.author}</p>
                <p>Dept: ${b.dept}</p>
                <p>Available: ${b.qty - b.issued}</p>

                <button onclick="editBook('${b.id}', '${safeTitle}', '${safeAuthor}', '${safeDept}', '${b.qty}')">
                    ✏️ Edit
                </button>
            </div>`;
        });
    } catch (err) {
        console.error("loadBooks error:", err);
        const div = document.getElementById("books");
        if (div) div.innerHTML = `<p>Failed to load books ⚠️</p>`;
        toast("Failed to load books ⚠️");
    }
}

// ================= REQUESTS =================
async function loadRequests() {
    try {
        const data = await (await fetch(`${API}/requests`)).json();

        const div = document.getElementById("requestList");
        div.innerHTML = "";

        // Find the Requests nav button by text content (more reliable than nth-child)
        const reqBtn = Array.from(document.querySelectorAll(".nav-btn"))
            .find(btn => btn.textContent.includes("Requests"));

        if (data.length === 0) {
            div.innerHTML = `<p>No pending requests 📭</p>`;
            if (reqBtn) reqBtn.innerHTML = "📩 Requests";
            return;
        }

        if (reqBtn) reqBtn.innerHTML = `📩 Requests <span class="badge">${data.length}</span>`;

        data.forEach(r => {
            div.innerHTML += `
            <div class="card">
                <h3>${r.student.name || "Unknown"}</h3>
                <p>Roll: ${r.student.roll || r.student.Id || "N/A"}</p>
                <p>Dept: ${r.student.dept || "N/A"}</p>

                <p style="color:${r.type === "return" ? "#f59e0b" : "#22c55e"}">
                    ${r.type === "return" ? "🔁 Return Request" : "📚 Issue Request"}
                </p>

                <button onclick="approve('${r.id}', '${r.type}')">✅ Approve</button>
                <button onclick="cancelRequest('${r.id}')">❌ Reject</button>
            </div>`;
        });
    } catch (err) {
        console.error("loadRequests error:", err);
        const div = document.getElementById("requestList");
        if (div) div.innerHTML = `<p>Failed to load requests ⚠️</p>`;
    }
}

// ================= APPROVE =================
async function approve(id, type) {
    try {
        const res = await fetch(`${API}/approve/${id}`, { method: "POST" });
        if (!res.ok) throw new Error("Approve failed");

        toast(type === "return" ? "Book Returned 🔁" : "Book Issued 📚");
        refreshAll();
    } catch (err) {
        console.error("approve error:", err);
        toast("Failed to approve request ⚠️");
    }
}

// ================= CANCEL =================
async function cancelRequest(id) {
    try {
        const res = await fetch(`${API}/cancel/${id}`, { method: "POST" });
        if (!res.ok) throw new Error("Cancel failed");

        toast("Request Rejected ❌");
        loadRequests();
    } catch (err) {
        console.error("cancelRequest error:", err);
        toast("Failed to reject request ⚠️");
    }
}

// ================= ISSUED =================
async function loadIssued() {
    try {
        const books = await (await fetch(`${API}/books`)).json();

        const table = document.getElementById("issuedTable");
        table.innerHTML = "";

        let hasRows = false;

        books.forEach(b => {
            (b.issuedTo || []).forEach(s => {
                hasRows = true;
                table.innerHTML += `
                <tr>
                    <td>${b.title}</td>
                    <td>${s.name || "N/A"}</td>
                    <td>${s.roll || "N/A"}</td>
                    <td>${s.dept || "N/A"}</td>
                </tr>`;
            });
        });

        if (!hasRows) {
            table.innerHTML = `<tr><td colspan="4" style="text-align:center">No books currently issued 📭</td></tr>`;
        }
    } catch (err) {
        console.error("loadIssued error:", err);
        const table = document.getElementById("issuedTable");
        if (table) table.innerHTML = `<tr><td colspan="4" style="text-align:center">Failed to load issued books ⚠️</td></tr>`;
    }
}

// ================= STUDENTS =================
async function loadStudents() {
    try {
        const data = await (await fetch(`${API}/analytics`)).json();
        const table = document.getElementById("studentTable");
        if (!table) return;

        table.innerHTML = "";

        const students = data.topStudents || [];

        if (students.length === 0) {
            table.innerHTML = `<tr><td colspan="4" style="text-align:center">No student data yet 📭</td></tr>`;
            return;
        }

        students.forEach(s => {
            table.innerHTML += `
            <tr>
                <td>${s.name || "N/A"}</td>
                <td>${s.roll || "N/A"}</td>
                <td>${s.dept || "N/A"}</td>
                <td>${s.count || 0}</td>
            </tr>`;
        });
    } catch (err) {
        console.error("loadStudents error:", err);
        const table = document.getElementById("studentTable");
        if (table) table.innerHTML = `<tr><td colspan="4" style="text-align:center">Failed to load students ⚠️</td></tr>`;
    }
}

// ================= CHART =================
async function loadChart() {
    try {
        const books = await (await fetch(`${API}/books`)).json();

        let total = books.reduce((a, b) => a + b.qty, 0);
        let issued = books.reduce((a, b) => a + b.issued, 0);

        if (window.myChart) window.myChart.destroy();

        window.myChart = new Chart(document.getElementById("chart"), {
            type: "doughnut",
            data: {
                labels: ["Available", "Issued"],
                datasets: [{
                    data: [total - issued, issued],
                    backgroundColor: ["#3b82f6", "#9333ea"]
                }]
            },
            options: {
                plugins: {
                    legend: { labels: { color: "white" } }
                }
            }
        });
    } catch (err) {
        console.error("loadChart error:", err);
    }
}

// ================= REFRESH =================
function refreshAll() {
    loadRequests();
    loadBooks();
    loadIssued();
    loadChart();
}

// 🔄 LIVE REFRESH
setInterval(loadRequests, 5000);

// INIT
window.onload = () => {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";
    refreshAll();
};
