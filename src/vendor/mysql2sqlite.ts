import unescape from "unescape-js";

/**
 * Mysql to SQLite converter - Modified for Soridata dumps
 * https://github.com/ww9/mysql2sqlite
 * The Unlicense
 * https://github.com/ww9/mysql2sqlite/blob/master/LICENSE
 */
export const mysql2sqlite = (mysqldump: string) => {
  const CREATE_TABLE = /^\s*CREATE TABLE.*[`"](.*)[`"]/i;

  let sqlite =
    "" +
    "-- import to SQLite by running: sqlite3.exe db.sqlite3 -init sqlite.sql\n\n" +
    "PRAGMA journal_mode = MEMORY;\n" +
    "PRAGMA synchronous = OFF;\n" +
    "PRAGMA foreign_keys = OFF;\n" +
    "PRAGMA ignore_check_constraints = OFF;\n" +
    "PRAGMA auto_vacuum = NONE;\n" +
    "PRAGMA secure_delete = OFF;\n" +
    "BEGIN TRANSACTION;\n\n";

  let currentTable = "";
  let lines = mysqldump.split("\n");

  // lines we skip
  const skip = [/^CREATE DATABASE/i, /^USE/i, /^\/\*/i, /^--/i] as const;
  const keys = [];

  const shouldSkip = (line: string) => {
    return skip.some((regex) => regex.test(line));
  };

  // Used this site to test regexes: https://regex101.com/

  for (let line of lines) {
    // Skip lines that match regexes in the skip[] array above
    if (shouldSkip(line)) continue;

    // Include all `INSERT` lines
    if (/^(INSERT|\()/i.test(line)) {
      // convert JSON strings to SQLite strings
      line = line.replaceAll(/"({.+})"/g, (match, p1: string) => {
        if (!p1) return match;
        let unescaped: string = p1;
        try {
          // keep unescaping. Some soridata is double escaped
          while (unescape(unescaped) !== unescaped) {
            unescaped = unescape(unescaped);
          }
          const data = JSON.parse(unescaped);

          // stringify, but turn any ' into '' for sqlite escape
          return `'${JSON.stringify(data).replaceAll("'", "''")}'`;
        } catch (e) {
          console.error("LINE", line);
          console.error("UNESC", unescaped);
          process.exit(1);
        }
      });

      // switch from mysql escape to sqlite escape
      line = line.replaceAll(/\\'/gi, "''");

      sqlite += line;
      continue;
    }

    // Print the ´CREATE´ line as is and capture the table name
    const createTable = CREATE_TABLE.exec(line) ?? null;
    if (createTable !== null && createTable[1]) {
      currentTable = createTable[1];
      sqlite += "\n" + line + "\n";
      continue;
    }

    // Clean table end line like:
    // ) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8 COMMENT='By definition:\r\n- user_group #1 is administrator and will always have all permissions.\r\n- user_group #2 is guest and always have no permissions.\r\n';
    if (line.startsWith(")")) {
      sqlite += ");\n";
      continue;
    }

    // Remove CONSTRAINT `fk_address_state1`" part from lines
    line = line.replace(/^CONSTRAINT [`'"][\w]+[`'"][\s]+/gi, "");

    // Replace "XXXXX KEY" by "KEY" except "PRIMARY KEY" "FOREIGN KEY" and "UNIQUE KEY"
    line = line.replace(/^[^FOREIGN][^PRIMARY][^UNIQUE]\w+\s+KEY/gi, "KEY");

    // Lines starting with (UNIQUE) KEY are extracted so we declare them all at the end of the script
    // We also append key name with table name to avoid duplicate index name
    // Example: KEY `name` (`permission_name`)
    const UNIQUE_CONSTRAINT =
      /^(UNIQUE\s)*KEY\s+[`'"](\w+)[`'"]\s+\([`'"](\w+)[`'"]/gi;
    const uniqueConstraint = UNIQUE_CONSTRAINT.exec(line) ?? null;
    if (uniqueConstraint && uniqueConstraint?.[3]) {
      const keyUnique = uniqueConstraint[1] || "";
      const keyName = uniqueConstraint[2];
      const colName = uniqueConstraint[3];
      keys.push(
        "CREATE " +
          keyUnique +
          "INDEX `" +
          currentTable +
          "_" +
          keyName +
          "` ON `" +
          currentTable +
          "` (`" +
          colName +
          "`);"
      );
      continue;
    }

    // Print all fields definition lines except "KEY" lines and lines starting with ")"
    if (/^[^)]((?![\w]+\sKEY).)*$/gi.test(line)) {
      // Clear invalid keywords
      line = line.replace(
        /AUTO_INCREMENT|CHARACTER SET [^ ]+|CHARACTER SET [^ ]+|UNSIGNED/gi,
        ""
      );
      line = line.replace(
        /DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP|COLLATE [^ ]+/gi,
        ""
      );
      line = line.replace(/COMMENT\s['"`].*['"`]/gi, "");
      line = line.replace(/SET\([^)]+\)|ENUM[^)]+\)/gi, "TEXT ");
      // Clear weird MySQL types such as varchar(40) and int(11)
      line = line.replace(/int\([0-9]*\)/gi, "INTEGER");
      line = line.replace(/varchar\([0-9]*\)|LONGTEXT/gi, "TEXT");
    }

    if (line != "") {
      sqlite += line + "\n";
    }
  }

  sqlite += "\n";

  // Fix last table line with comma
  sqlite = sqlite.replace(/,\n\);/g, "\n);");

  // Include all gathered keys as CREATE INDEX
  sqlite += "\n\n" + keys.join("\n") + "\n\n";

  // Re-enable foreign key check
  sqlite +=
    "COMMIT;\n" +
    "PRAGMA ignore_check_constraints = ON;\n" +
    "PRAGMA foreign_keys = ON;\n" +
    "PRAGMA journal_mode = WAL;\n" +
    "PRAGMA synchronous = NORMAL;\n";

  return sqlite;

  // breaks json strings
  // return sqlite.replaceAll(/0x(\w+)/ig, "X'$1'");
};