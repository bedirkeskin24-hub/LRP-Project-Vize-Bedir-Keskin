const api = "/api";

function getUser() {
    const saved = sessionStorage.getItem("activeUser");
    return saved ? JSON.parse(saved) : null;
}

function setUser(user) {
    sessionStorage.setItem("activeUser", JSON.stringify(user));
}

function checkAuth() {
    const needRole = document.body.dataset.role;
    if (!needRole) {
        return;
    }

    const user = getUser();
    if (!user) {
        location.href = "login.html";
        return;
    }

    if (user.role !== needRole) {
        location.href = user.role === "Admin" ? "index.html" : "student.html";
    }
}

async function request(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "İşlem başarısız." }));
        throw new Error(error.message || "İşlem başarısız.");
    }
    return response.json();
}

function login() {
    const form = document.getElementById("loginForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const message = document.getElementById("loginMessage");
        message.textContent = "";

        try {
            const user = await request(`${api}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: document.getElementById("username").value.trim(),
                    password: document.getElementById("password").value.trim()
                })
            });

            setUser(user);
            location.href = user.role === "Admin" ? "index.html" : "student.html";
        } catch (error) {
            message.textContent = error.message;
        }
    });
}

function logout() {
    const button = document.getElementById("logoutBtn");
    if (!button) {
        return;
    }

    button.addEventListener("click", function () {
        sessionStorage.removeItem("activeUser");
        location.href = "login.html";
    });
}

async function loadLabs() {
    const table = document.getElementById("labTable");
    const select = document.getElementById("pcLab");
    if (!table || !select) {
        return;
    }

    const labs = await request(`${api}/labs`);
    table.innerHTML = "";
    select.innerHTML = "";

    labs.forEach(function (lab) {
        table.innerHTML += `
            <tr>
                <td>${lab.code}</td>
                <td>${lab.name}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editLab(${lab.id}, '${lab.code}', '${lab.name}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </td>
            </tr>
        `;
        select.innerHTML += `<option value="${lab.id}">${lab.code} - ${lab.name}</option>`;
    });
}

function saveLab() {
    const form = document.getElementById("labForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const id = document.getElementById("labId").value;
        const data = {
            code: document.getElementById("labCode").value.trim(),
            name: document.getElementById("labName").value.trim()
        };

        await request(id ? `${api}/labs/${id}` : `${api}/labs`, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        form.reset();
        document.getElementById("labId").value = "";
        await loadLabs();
        await loadComputers();
    });
}

function editLab(id, code, name) {
    document.getElementById("labId").value = id;
    document.getElementById("labCode").value = code;
    document.getElementById("labName").value = name;
}

function saveComputer() {
    const form = document.getElementById("pcForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const studentNo = document.getElementById("pcStudentNo").value.trim();
        const fullName = document.getElementById("pcStudentName").value.trim();

        if ((studentNo && !fullName) || (!studentNo && fullName)) {
            alert("Öğrenci hesabı oluşturmak için öğrenci no ve ad soyad birlikte girilmelidir.");
            return;
        }

        await request(`${api}/computers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                labId: Number(document.getElementById("pcLab").value),
                brand: document.getElementById("pcBrand").value.trim(),
                cpu: document.getElementById("pcCpu").value.trim(),
                ram: document.getElementById("pcRam").value.trim(),
                hasHdmi: document.getElementById("pcHdmi").checked,
                hasVeyon: document.getElementById("pcVeyon").checked,
                studentNo,
                fullName
            })
        });

        form.reset();
        await loadComputers();
        await loadStudents();
    });
}

async function loadComputers() {
    const table = document.getElementById("pcTable");
    const assignSelect = document.getElementById("assignPc");
    if (!table && !assignSelect) {
        return;
    }

    const computers = await request(`${api}/computers`);

    if (table) {
        table.innerHTML = "";
        computers.forEach(function (pc) {
            const student = pc.studentNo ? `${pc.studentNo} - ${pc.studentName}` : "Atanmadı";
            table.innerHTML += `
                <tr>
                    <td>${pc.assetCode}</td>
                    <td>${pc.labCode}</td>
                    <td>${pc.brand}</td>
                    <td>${pc.cpu}</td>
                    <td>${pc.ram}</td>
                    <td>${pc.hasHdmi ? "Var" : "Yok"}</td>
                    <td>${pc.hasVeyon ? "Var" : "Yok"}</td>
                    <td>${student}</td>
                </tr>
            `;
        });
    }

    if (assignSelect) {
        assignSelect.innerHTML = "";
        computers.forEach(function (pc) {
            assignSelect.innerHTML += `<option value="${pc.id}">${pc.assetCode} - ${pc.brand}</option>`;
        });
    }
}

function saveAssignment() {
    const form = document.getElementById("assignForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const message = document.getElementById("assignMessage");
        message.textContent = "";
        message.classList.remove("text-danger");
        message.classList.add("text-success");

        try {
            const result = await request(`${api}/assignments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    computerId: Number(document.getElementById("assignPc").value),
                    studentNo: document.getElementById("studentNo").value.trim(),
                    fullName: document.getElementById("studentName").value.trim()
                })
            });

            form.reset();
            message.textContent = result.message;
            await loadComputers();
            await loadStudents();
        } catch (error) {
            message.classList.remove("text-success");
            message.classList.add("text-danger");
            message.textContent = error.message;
        }
    });
}

async function loadStudents() {
    const table = document.getElementById("studentAccountTable");
    if (!table) {
        return;
    }

    const students = await request(`${api}/students`);
    table.innerHTML = "";

    students.forEach(function (student) {
        table.innerHTML += `
            <tr>
                <td>${student.studentNo}</td>
                <td>${student.fullName}</td>
                <td>${student.username}</td>
                <td>${student.password}</td>
            </tr>
        `;
    });
}

async function loadStudentComputers() {
    const table = document.getElementById("studentTable");
    const info = document.getElementById("studentInfo");
    const title = document.getElementById("studentNameTitle");
    const count = document.getElementById("studentComputerCount");
    if (!table || !info) {
        return;
    }

    const user = getUser();
    if (title) {
        title.textContent = user.fullName || "Zimmet Bilgilerim";
    }

    info.innerHTML = `
        <span><i class="fa-solid fa-hashtag me-1"></i>${user.studentNo}</span>
        <span><i class="fa-solid fa-user me-1"></i>${user.fullName}</span>
    `;

    const computers = await request(`${api}/students/${user.studentNo}/computers`);
    if (count) {
        count.textContent = computers.length;
    }

    table.innerHTML = "";

    if (computers.length === 0) {
        table.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">Üzerinize kayıtlı bilgisayar bulunamadı.</td></tr>`;
        return;
    }

    computers.forEach(function (pc) {
        table.innerHTML += `
            <tr>
                <td>${pc.assetCode}</td>
                <td>${pc.labCode}</td>
                <td>${pc.brand}</td>
                <td>${pc.cpu}</td>
                <td>${pc.ram}</td>
                <td>${pc.hasHdmi ? "Var" : "Yok"}</td>
                <td>${pc.hasVeyon ? "Var" : "Yok"}</td>
            </tr>
        `;
    });
}

async function startAdmin() {
    await loadLabs();
    await loadComputers();
    await loadStudents();
    saveLab();
    saveComputer();
    saveAssignment();
}

function startStudent() {
    loadStudentComputers();
}

checkAuth();
login();
logout();

if (document.body.dataset.role === "Admin") {
    startAdmin();
}

if (document.body.dataset.role === "Student") {
    startStudent();
}
