CREATE TABLE [organizations] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(120) NOT NULL,
  PRIMARY KEY ([id])
);
GO
CREATE TABLE [users] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [org_id] INT NOT NULL,
  [email] NVARCHAR(255) NOT NULL UNIQUE,
  [role] NVARCHAR(255) NOT NULL DEFAULT 'member' CHECK ([role] IN ('admin', 'member', 'guest')),
  [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ([id])
);
GO
CREATE UNIQUE INDEX [ix_users_email] ON [users] ([email]);
GO
ALTER TABLE [users] ADD CONSTRAINT [fk_users_org] FOREIGN KEY ([org_id]) REFERENCES [organizations] ([id]) ON DELETE CASCADE;
