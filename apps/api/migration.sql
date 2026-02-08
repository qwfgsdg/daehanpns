-- AlterEnum
BEGIN;
CREATE TYPE "ChatType_new" AS ENUM ('ONE_TO_N', 'ONE_TO_ONE');
ALTER TABLE "ChatRoom" ALTER COLUMN "type" TYPE "ChatType_new" USING ("type"::text::"ChatType_new");
ALTER TYPE "ChatType" RENAME TO "ChatType_old";
ALTER TYPE "ChatType_new" RENAME TO "ChatType";
DROP TYPE "ChatType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "MemberTypeHistory" DROP CONSTRAINT "MemberTypeHistory_userId_fkey";

-- DropIndex
DROP INDEX "User_memberType_idx";

-- DropIndex
DROP INDEX "ChatRoom_category_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "memberType",
DROP COLUMN "showCoinRooms";

-- AlterTable
ALTER TABLE "ChatRoom" DROP COLUMN "category";

-- DropTable
DROP TABLE "MemberTypeHistory";

-- DropEnum
DROP TYPE "MemberType";

-- DropEnum
DROP TYPE "RoomCategory";

