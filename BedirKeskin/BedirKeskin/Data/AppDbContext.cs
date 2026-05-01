using Microsoft.EntityFrameworkCore;

class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Lab> Labs => Set<Lab>();
    public DbSet<Computer> Computers => Set<Computer>();
    public DbSet<Student> Students => Set<Student>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>().HasIndex(x => x.Username).IsUnique();
        modelBuilder.Entity<Lab>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Computer>().HasIndex(x => x.AssetCode).IsUnique();
        modelBuilder.Entity<Student>().HasIndex(x => x.StudentNo).IsUnique();
    }
}
