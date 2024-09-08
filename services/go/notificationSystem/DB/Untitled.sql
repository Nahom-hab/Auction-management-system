CREATE TYPE "auction_type" AS ENUM (
  'open',
  'closed'
);

CREATE TYPE "auction_style" AS ENUM (
  'increasing',
  'decreasing'
);

CREATE TABLE "user" (
  "id" bigint PRIMARY KEY,
  "first_name" varchar,
  "last_name" varchar,
  "country_code" varchar(3),
  "phone_number" varchar,
  "profile_img_url" varchar,
  "status" varchar,
  "password" varchar,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "email" email,
  "verified" bool
);

CREATE TABLE "user_authentication" (
  "user_id" bigint PRIMARY KEY,
  "security_question_ans" varchar
);

CREATE TABLE "transaction" (
  "id" bigint PRIMARY KEY,
  "user_id" bigint,
  "txRef" varchar UNIQUE,
  "amount" decimal(10,2),
  "status" varchar DEFAULT 'PENDING',
  "created_at" timestamptz,
  "updated_at" timestamptz
);

CREATE TABLE "auction" (
  "id" bigint PRIMARY KEY,
  "user_id" bigint,
  "auction_style" auction_style,
  "auction_category" varchar,
  "auction_type" auction_type,
  "auction_description" varchar,
  "starting_bid" decimal(10,2),
  "increment_amount" decimal(6,2) DEFAULT 0,
  "bid_starting_time" timestamptz,
  "current_max_bid" decimal(10,2),
  "bid_closing_time" timestamptz,
  "bid_winner_id" bigint,
  "created_at" timestamptz,
  "updated_at" timestamptz
);

CREATE TABLE "item" (
  "id" bigint PRIMARY KEY,
  "auction_id" bigint,
  "item_name" varchar,
  "preview_image" varchar,
  "images_url" varchar[]
);

CREATE TABLE "auction_history" (
  "id" bigint PRIMARY KEY,
  "auction_id" bigint,
  "user_id" bigint,
  "winning_amount" decimal(10,2),
  "created_at" timestamptz
);

CREATE TABLE "bid" (
  "id" bigint PRIMARY KEY,
  "user_id" bigint,
  "auction_id" bigint,
  "amount" decimal(10,2)
);

CREATE TABLE "proxy_bidding" (
  "id" bigint PRIMARY KEY,
  "user_id" bigint,
  "auction_id" bigint,
  "amount" decimal(10,2),
  "increasing_amount" decimal(10,2)
);

CREATE TABLE "escrow" (
  "id" bigint PRIMARY KEY,
  "auction_id" bigint,
  "user_id" bigint,
  "amount" decimal(10,2),
  "status" varchar DEFAULT 'PENDING',
  "updated_at" timestamptz
);

CREATE TABLE "feedback" (
  "id" bigint PRIMARY KEY,
  "user_id" bigint,
  "feedback_text" varchar
);

CREATE TABLE "balance" (
  "id" bigint PRIMARY KEY,
  "user_id" bigint,
  "current_balance" decimal(10,2) DEFAULT 0,
  "updated_at" timestamptz
);

COMMENT ON COLUMN "transaction"."amount" IS 'Positive for payment, negative for refund';

ALTER TABLE "item" ADD FOREIGN KEY ("auction_id") REFERENCES "auction" ("id");

ALTER TABLE "user" ADD FOREIGN KEY ("id") REFERENCES "user_authentication" ("user_id");

ALTER TABLE "auction" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");

ALTER TABLE "auction" ADD FOREIGN KEY ("bid_winner_id") REFERENCES "user" ("id");

ALTER TABLE "auction_history" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");

ALTER TABLE "auction_history" ADD FOREIGN KEY ("auction_id") REFERENCES "auction" ("id");

ALTER TABLE "bid" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");

ALTER TABLE "bid" ADD FOREIGN KEY ("auction_id") REFERENCES "auction" ("id");

ALTER TABLE "user" ADD FOREIGN KEY ("id") REFERENCES "proxy_bidding" ("user_id");

ALTER TABLE "auction" ADD FOREIGN KEY ("id") REFERENCES "proxy_bidding" ("auction_id");

ALTER TABLE "feedback" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");

ALTER TABLE "balance" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");

ALTER TABLE "escrow" ADD FOREIGN KEY ("auction_id") REFERENCES "auction" ("id");

ALTER TABLE "escrow" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");
