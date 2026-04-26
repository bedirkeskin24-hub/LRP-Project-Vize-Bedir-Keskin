const users = [
    { username: "admin", password: "123", role: "Admin" },
    { username: "student", password: "123", role: "Student" }
];

const sampleData = {
    labs: [
        { id: 1, code: "LAB1", name: "Bilgisayar Laboratuvarı 1" }
    ],
    pcs: [
        {
            id: 1,
            code: "LAB1-PC-01",
            labCode: "LAB1",
            brand: "Lenovo",
            cpu: "i5",
            ram: "8 GB",
            hdmi: true,
            veyon: true,
            student: "student"
        }
    ]
};

function getData() {
    const saved = localStorage.getItem("labData");
    if (saved) {
        return JSON.parse(saved);
    }
    localStorage.setItem("labData", JSON.stringify(sampleData));
    return sampleData;
}

function setData(data) {
    localStorage.setItem("labData", JSON.stringify(data));
}

function getUser() {
    const saved = localStorage.getItem("activeUser");
    return saved ? JSON.parse(saved) : null;
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

function login() {
    const form = document.getElementById("loginForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        const user = users.find(x => x.username === username && x.password === password);

        if (!user) {
            document.getElementById("loginMessage").textContent = "Kullanıcı adı veya şifre hatalı.";
            return;
        }

        localStorage.setItem("activeUser", JSON.stringify({ username: user.username, role: user.role }));
        location.href = user.role === "Admin" ? "index.html" : "student.html";
    });
}

function logout() {
    const button = document.getElementById("logoutBtn");
    if (!button) {
        return;
    }

    button.addEventListener("click", function () {
        localStorage.removeItem("activeUser");
        location.href = "login.html";
    });
}

function renderLabs() {
    const table = document.getElementById("labTable");
    const select = document.getElementById("pcLab");
    if (!table || !select) {
        return;
    }

    const data = getData();
    table.innerHTML = "";
    select.innerHTML = "";

    data.labs.forEach(function (lab) {
        table.innerHTML += `
            <tr>
                <td>${lab.code}</td>
                <td>${lab.name}</td>
                <td><button class="table-btn" onclick="editLab(${lab.id})">Düzenle</button></td>
            </tr>
        `;
        select.innerHTML += `<option value="${lab.code}">${lab.code} - ${lab.name}</option>`;
    });
}

function saveLab() {
    const form = document.getElementById("labForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const data = getData();
        const id = document.getElementById("labId").value;
        const code = document.getElementById("labCode").value.trim().toUpperCase();
        const name = document.getElementById("labName").value.trim();

        if (id) {
            const lab = data.labs.find(x => x.id == id);
            const oldCode = lab.code;
            lab.code = code;
            lab.name = name;
            data.pcs.forEach(function (pc) {
                if (pc.labCode === oldCode) {
                    pc.labCode = code;
                    pc.code = pc.code.replace(oldCode, code);
                }
            });
        } else {
            data.labs.push({ id: Date.now(), code, name });
        }

        setData(data);
        form.reset();
        document.getElementById("labId").value = "";
        renderLabs();
        renderPcs();
    });
}

function editLab(id) {
    const data = getData();
    const lab = data.labs.find(x => x.id === id);
    document.getElementById("labId").value = lab.id;
    document.getElementById("labCode").value = lab.code;
    document.getElementById("labName").value = lab.name;
}

function nextPcCode(labCode) {
    const data = getData();
    const count = data.pcs.filter(x => x.labCode === labCode).length + 1;
    return `${labCode}-PC-${String(count).padStart(2, "0")}`;
}

function savePc() {
    const form = document.getElementById("pcForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const data = getData();
        const labCode = document.getElementById("pcLab").value;

        data.pcs.push({
            id: Date.now(),
            code: nextPcCode(labCode),
            labCode,
            brand: document.getElementById("pcBrand").value.trim(),
            cpu: document.getElementById("pcCpu").value.trim(),
            ram: document.getElementById("pcRam").value.trim(),
            hdmi: document.getElementById("pcHdmi").checked,
            veyon: document.getElementById("pcVeyon").checked,
            student: document.getElementById("pcStudent").value.trim()
        });

        setData(data);
        form.reset();
        renderPcs();
    });
}

function renderPcs() {
    const table = document.getElementById("pcTable");
    if (!table) {
        return;
    }

    const data = getData();
    table.innerHTML = "";
    data.pcs.forEach(function (pc) {
        table.innerHTML += `
            <tr>
                <td>${pc.code}</td>
                <td>${pc.labCode}</td>
                <td>${pc.brand}</td>
                <td>${pc.cpu}</td>
                <td>${pc.ram}</td>
                <td>${pc.hdmi ? "Var" : "Yok"}</td>
                <td>${pc.veyon ? "Var" : "Yok"}</td>
                <td>${pc.student}</td>
            </tr>
        `;
    });
}

function renderStudent() {
    const table = document.getElementById("studentTable");
    if (!table) {
        return;
    }

    const user = getUser();
    const data = getData();
    const pcs = data.pcs.filter(x => x.student.toLowerCase() === user.username.toLowerCase());

    table.innerHTML = "";
    pcs.forEach(function (pc) {
        table.innerHTML += `
            <tr>
                <td>${pc.code}</td>
                <td>${pc.labCode}</td>
                <td>${pc.brand}</td>
                <td>${pc.cpu}</td>
                <td>${pc.ram}</td>
                <td>${pc.hdmi ? "Var" : "Yok"}</td>
                <td>${pc.veyon ? "Var" : "Yok"}</td>
            </tr>
        `;
    });
}

checkAuth();
login();
logout();
renderLabs();
saveLab();
savePc();
renderPcs();
renderStudent();
