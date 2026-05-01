using Microsoft.EntityFrameworkCore;
using System.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=labtakip.db"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    EnsureLabTakipSchema(db);

    if (!db.Users.Any())
    {
        db.Users.Add(new AppUser
        {
            Username = "admin",
            Password = "123",
            Role = "Admin"
        });
    }

    if (!db.Labs.Any())
    {
        var lab = new Lab
        {
            Code = "LAB1",
            Name = "Bilgisayar Laboratuvarı 1"
        };

        db.Labs.Add(lab);
        db.SaveChanges();

        db.Computers.Add(new Computer
        {
            AssetCode = "LAB1-PC-01",
            Brand = "Lenovo",
            Cpu = "i5",
            Ram = "8 GB",
            HasHdmi = true,
            HasVeyon = true,
            LabId = lab.Id
        });
    }

    db.SaveChanges();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/", () => Results.Redirect("/login.html"));

app.MapPost("/api/auth/login", async (LoginRequest request, AppDbContext db) =>
{
    var user = await db.Users
        .Include(x => x.Student)
        .FirstOrDefaultAsync(x => x.Username == request.Username && x.Password == request.Password);

    if (user == null)
    {
        return Results.BadRequest(new { message = "Kullanıcı adı veya şifre hatalı." });
    }

    return Results.Ok(new
    {
        user.Id,
        user.Username,
        user.Role,
        studentNo = user.Student == null ? "" : user.Student.StudentNo,
        fullName = user.Student == null ? "" : user.Student.FullName
    });
});

app.MapGet("/api/labs", async (AppDbContext db) =>
    await db.Labs.OrderBy(x => x.Code).ToListAsync());

app.MapPost("/api/labs", async (LabRequest request, AppDbContext db) =>
{
    var lab = new Lab
    {
        Code = request.Code.Trim().ToUpper(),
        Name = request.Name.Trim()
    };

    db.Labs.Add(lab);
    await db.SaveChangesAsync();
    return Results.Ok(lab);
});

app.MapPut("/api/labs/{id:int}", async (int id, LabRequest request, AppDbContext db) =>
{
    var lab = await db.Labs.FindAsync(id);
    if (lab == null)
    {
        return Results.NotFound();
    }

    var oldCode = lab.Code;
    var newCode = request.Code.Trim().ToUpper();

    lab.Code = newCode;
    lab.Name = request.Name.Trim();

    var computers = await db.Computers.Where(x => x.LabId == id).ToListAsync();
    foreach (var computer in computers)
    {
        computer.AssetCode = computer.AssetCode.Replace(oldCode, newCode);
    }

    await db.SaveChangesAsync();
    return Results.Ok(lab);
});

app.MapGet("/api/computers", async (AppDbContext db) =>
    await db.Computers
        .Include(x => x.Lab)
        .Include(x => x.Student)
        .OrderBy(x => x.AssetCode)
        .Select(x => new
        {
            x.Id,
            x.AssetCode,
            labCode = x.Lab.Code,
            labName = x.Lab.Name,
            x.Brand,
            x.Cpu,
            x.Ram,
            x.HasHdmi,
            x.HasVeyon,
            studentNo = x.Student == null ? "" : x.Student.StudentNo,
            studentName = x.Student == null ? "" : x.Student.FullName
        })
        .ToListAsync());

app.MapPost("/api/computers", async (ComputerRequest request, AppDbContext db) =>
{
    var lab = await db.Labs.FindAsync(request.LabId);
    if (lab == null)
    {
        return Results.BadRequest(new { message = "Laboratuvar bulunamadı." });
    }

    var count = await db.Computers.CountAsync(x => x.LabId == lab.Id) + 1;
    var assetCode = $"{lab.Code}-PC-{count.ToString("00")}";

    var computer = new Computer
    {
        AssetCode = assetCode,
        Brand = request.Brand.Trim(),
        Cpu = request.Cpu.Trim(),
        Ram = request.Ram.Trim(),
        HasHdmi = request.HasHdmi,
        HasVeyon = request.HasVeyon,
        LabId = lab.Id
    };

    if (!string.IsNullOrWhiteSpace(request.StudentNo) || !string.IsNullOrWhiteSpace(request.FullName))
    {
        if (string.IsNullOrWhiteSpace(request.StudentNo) || string.IsNullOrWhiteSpace(request.FullName))
        {
            return Results.BadRequest(new { message = "Ogrenci no ve ad soyad birlikte girilmelidir." });
        }

        var student = await SaveStudentAccountAsync(db, request.StudentNo, request.FullName);
        computer.StudentId = student.Id;
    }

    db.Computers.Add(computer);
    await db.SaveChangesAsync();
    return Results.Ok(computer);
});

app.MapPost("/api/assignments", async (AssignmentRequest request, AppDbContext db) =>
{
    var computer = await db.Computers.FindAsync(request.ComputerId);
    if (computer == null)
    {
        return Results.BadRequest(new { message = "Bilgisayar bulunamadı." });
    }

    var student = await SaveStudentAccountAsync(db, request.StudentNo, request.FullName);
    computer.StudentId = student.Id;
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        message = "Öğrenci atandı. Kullanıcı adı ve şifre öğrenci numarasıdır."
    });
});

app.MapGet("/api/students", async (AppDbContext db) =>
    await db.Students
        .OrderBy(x => x.StudentNo)
        .Select(x => new
        {
            x.Id,
            x.StudentNo,
            x.FullName,
            username = x.StudentNo,
            password = x.StudentNo
        })
        .ToListAsync());

app.MapGet("/api/students/{studentNo}/computers", async (string studentNo, AppDbContext db) =>
    await db.Computers
        .Include(x => x.Lab)
        .Include(x => x.Student)
        .Where(x => x.Student != null && x.Student.StudentNo == studentNo)
        .OrderBy(x => x.AssetCode)
        .Select(x => new
        {
            x.Id,
            x.AssetCode,
            labCode = x.Lab.Code,
            labName = x.Lab.Name,
            x.Brand,
            x.Cpu,
            x.Ram,
            x.HasHdmi,
            x.HasVeyon
        })
        .ToListAsync());

app.Run();

static void EnsureLabTakipSchema(AppDbContext db)
{
    db.Database.EnsureCreated();

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "Students" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_Students" PRIMARY KEY AUTOINCREMENT,
            "StudentNo" TEXT NOT NULL,
            "FullName" TEXT NOT NULL
        );
        """);

    AddColumnIfMissing(db, "Users", "StudentId", "INTEGER NULL");
    AddColumnIfMissing(db, "Computers", "StudentId", "INTEGER NULL");

    db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_Students_StudentNo" ON "Students" ("StudentNo");""");
    db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_Users_StudentId" ON "Users" ("StudentId");""");
    db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_Computers_StudentId" ON "Computers" ("StudentId");""");
}

static async Task<Student> SaveStudentAccountAsync(AppDbContext db, string studentNoValue, string fullNameValue)
{
    var studentNo = studentNoValue.Trim();
    var fullName = fullNameValue.Trim();

    var student = await db.Students.FirstOrDefaultAsync(x => x.StudentNo == studentNo);
    if (student == null)
    {
        student = new Student
        {
            StudentNo = studentNo,
            FullName = fullName
        };

        db.Students.Add(student);
        await db.SaveChangesAsync();
    }
    else
    {
        student.FullName = fullName;
    }

    var user = await db.Users.FirstOrDefaultAsync(x => x.Username == studentNo);
    if (user == null)
    {
        db.Users.Add(new AppUser
        {
            Username = studentNo,
            Password = studentNo,
            Role = "Student",
            StudentId = student.Id
        });
    }
    else
    {
        user.Password = studentNo;
        user.Role = "Student";
        user.StudentId = student.Id;
    }

    return student;
}

static void AddColumnIfMissing(AppDbContext db, string tableName, string columnName, string columnDefinition)
{
    if ((tableName, columnName, columnDefinition) is not
        ("Users", "StudentId", "INTEGER NULL") and not
        ("Computers", "StudentId", "INTEGER NULL"))
    {
        throw new InvalidOperationException("Unsupported schema repair operation.");
    }

    var connection = db.Database.GetDbConnection();
    if (connection.State != ConnectionState.Open)
    {
        connection.Open();
    }

    using var command = connection.CreateCommand();
    command.CommandText = $"PRAGMA table_info(\"{tableName}\");";

    using (var reader = command.ExecuteReader())
    {
        while (reader.Read())
        {
            if (string.Equals(reader["name"]?.ToString(), columnName, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }
        }
    }

    using var alterCommand = connection.CreateCommand();
    alterCommand.CommandText = $"""ALTER TABLE "{tableName}" ADD COLUMN "{columnName}" {columnDefinition};""";
    alterCommand.ExecuteNonQuery();
}

class AppUser
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string Role { get; set; } = "";
    public int? StudentId { get; set; }
    public Student? Student { get; set; }
}

class Lab
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public List<Computer> Computers { get; set; } = [];
}

class Computer
{
    public int Id { get; set; }
    public string AssetCode { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Cpu { get; set; } = "";
    public string Ram { get; set; } = "";
    public bool HasHdmi { get; set; }
    public bool HasVeyon { get; set; }
    public int LabId { get; set; }
    public Lab Lab { get; set; } = null!;
    public int? StudentId { get; set; }
    public Student? Student { get; set; }
}

class Student
{
    public int Id { get; set; }
    public string StudentNo { get; set; } = "";
    public string FullName { get; set; } = "";
    public List<Computer> Computers { get; set; } = [];
}

record LoginRequest(string Username, string Password);
record LabRequest(string Code, string Name);
record ComputerRequest(int LabId, string Brand, string Cpu, string Ram, bool HasHdmi, bool HasVeyon, string? StudentNo, string? FullName);
record AssignmentRequest(int ComputerId, string StudentNo, string FullName);
