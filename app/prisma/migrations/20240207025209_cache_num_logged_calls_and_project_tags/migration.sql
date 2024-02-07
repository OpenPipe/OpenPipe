-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "numLoggedCalls" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tagNames" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Function to increment numLoggedCalls
CREATE OR REPLACE FUNCTION increment_num_logged_calls()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Project"
    SET "numLoggedCalls" = "numLoggedCalls" + 1
    WHERE "id" = NEW."projectId";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that calls the function every time a row is inserted into LoggedCall
DROP TRIGGER IF EXISTS trigger_increment_num_logged_calls ON "LoggedCall";

CREATE TRIGGER trigger_increment_num_logged_calls
AFTER INSERT ON "LoggedCall"
FOR EACH ROW
EXECUTE FUNCTION increment_num_logged_calls();
