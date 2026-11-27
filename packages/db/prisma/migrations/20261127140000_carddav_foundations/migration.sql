-- CardDAV foundations: address book, cards, card versions, devices, and unmapped vCard extras.
--
-- None of these tables is replicated to mobile. `carddav_cards.person_id` has no foreign key on
-- purpose: a hard delete of the person must leave the tombstone findable by its person id.
-- Postgres treats NULLs as distinct in a unique index, so opaque cards (person_id NULL) never
-- collide with each other.

-- CreateEnum
CREATE TYPE "carddav_card_kind" AS ENUM ('person', 'opaque');

-- CreateTable
CREATE TABLE "carddav_address_books" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "generation" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revision" BIGINT NOT NULL DEFAULT 0,
    "reconciled_through" BIGINT NOT NULL DEFAULT 0,
    "tombstone_floor" BIGINT NOT NULL DEFAULT 0,
    "projection_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carddav_address_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carddav_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "address_book_id" UUID NOT NULL,
    "person_id" UUID,
    "kind" "carddav_card_kind" NOT NULL,
    "href" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "projection" JSONB,
    "raw_vcard" TEXT,
    "photo_version" TIMESTAMP(3),
    "etag" TEXT NOT NULL,
    "revision" BIGINT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carddav_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carddav_card_versions" (
    "card_id" UUID NOT NULL,
    "etag" TEXT NOT NULL,
    "projection" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carddav_card_versions_pkey" PRIMARY KEY ("card_id","etag")
);

-- CreateTable
CREATE TABLE "carddav_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "client_family" TEXT,
    "vcard_version" TEXT NOT NULL DEFAULT '3.0',
    "user_agent" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carddav_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people_vcard_extras" (
    "person_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "properties" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_vcard_extras_pkey" PRIMARY KEY ("person_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carddav_address_books_user_id_key" ON "carddav_address_books"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "carddav_cards_person_id_key" ON "carddav_cards"("person_id");

-- CreateIndex
CREATE INDEX "carddav_cards_address_book_id_revision_idx" ON "carddav_cards"("address_book_id", "revision");

-- CreateIndex
CREATE INDEX "carddav_cards_user_id_idx" ON "carddav_cards"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "carddav_cards_address_book_id_href_key" ON "carddav_cards"("address_book_id", "href");

-- CreateIndex
CREATE UNIQUE INDEX "carddav_cards_address_book_id_uid_key" ON "carddav_cards"("address_book_id", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "carddav_devices_api_key_id_key" ON "carddav_devices"("api_key_id");

-- CreateIndex
CREATE INDEX "carddav_devices_user_id_idx" ON "carddav_devices"("user_id");

-- CreateIndex
CREATE INDEX "people_vcard_extras_user_id_idx" ON "people_vcard_extras"("user_id");

-- AddForeignKey
ALTER TABLE "carddav_address_books" ADD CONSTRAINT "carddav_address_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carddav_cards" ADD CONSTRAINT "carddav_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carddav_cards" ADD CONSTRAINT "carddav_cards_address_book_id_fkey" FOREIGN KEY ("address_book_id") REFERENCES "carddav_address_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carddav_card_versions" ADD CONSTRAINT "carddav_card_versions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "carddav_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carddav_devices" ADD CONSTRAINT "carddav_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carddav_devices" ADD CONSTRAINT "carddav_devices_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "apikey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people_vcard_extras" ADD CONSTRAINT "people_vcard_extras_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people_vcard_extras" ADD CONSTRAINT "people_vcard_extras_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
