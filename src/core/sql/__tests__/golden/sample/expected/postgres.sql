CREATE TYPE "user_role" AS ENUM ('admin', 'member', 'guest');

CREATE TABLE "organizations" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" SERIAL NOT NULL,
  "org_id" INTEGER NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE /* login email */,
  "role" "user_role" NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ix_users_email" ON "users" ("email");

ALTER TABLE "users" ADD CONSTRAINT "fk_users_org" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
