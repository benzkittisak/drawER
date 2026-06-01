CREATE TABLE "organizations" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT(120) NOT NULL
);

CREATE TABLE "users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "org_id" INTEGER NOT NULL,
  "email" TEXT(255) NOT NULL UNIQUE,
  "role" TEXT(255) NOT NULL DEFAULT 'member' CHECK ("role" IN ('admin', 'member', 'guest')),
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ix_users_email" ON "users" ("email");

ALTER TABLE "users" ADD CONSTRAINT "fk_users_org" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
