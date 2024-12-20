/** A row in the KpopDB table app_kpop_group */
export type KpopDbRow = {
  /** Soridata ID */
  id: number,
  /** Is this a collaboration? If y, name is the combined name of a group */
  is_collab: "y" | "n",
  /** English name */
  name: string,
  /** Korean name */
  kname: string,
  /** Previous English name if the idol / group changed names */
  previous_name: string,
  /** Previous Korean name if the idol / group changed names */
  previous_kname: string,
  /** Full name of the idol / artist / group */
  fname: string,
  /** Alias of the idol / group */
  alias: string,
  /** Is a soloist */
  issolo: "y" | "n",
  /** ID of the parent group for subgroups and soloists in a group */
  id_parentgroup: number,
  /** Fanclub name */
  fanclub: string,
  /**
   * Social data. A JSON encoded object with the following keys:
   * T - twitter
   * I - instagram
   * F - facebook
   * Y - youtube
   * K - ?
   * V - vlive?
   * A - ?
   * S - spotify?
   * M - melon
   * N - naver
   * W - Web URL
   * 
   * May also deocde as [], which is considered EMTPY
   */
  social: string,
}

/*
CREATE TABLE `app_kpop_group` (
  `id` INTEGER  NOT NULL,
  `is_collab` TEXT   NOT NULL DEFAULT 'n',
  `name` TEXT  NOT NULL DEFAULT '',
  `kname` TEXT  NOT NULL DEFAULT '',
  `previous_name` TEXT  NOT NULL DEFAULT '',
  `previous_kname` TEXT  NOT NULL DEFAULT '',
  `fname` TEXT  NOT NULL DEFAULT '',
  `alias` TEXT  NOT NULL DEFAULT '',
  `id_company` INTEGER  NOT NULL DEFAULT '0',
  `members` TEXT   NOT NULL,
  `issolo` TEXT   NOT NULL DEFAULT 'n',
  `id_parentgroup` INTEGER  NOT NULL DEFAULT '0',
  `formation` mediumINTEGER DEFAULT NULL,
  `disband` TEXT  NOT NULL DEFAULT '',
  `fanclub` TEXT  DEFAULT NULL,
  `id_debut` INTEGER  DEFAULT NULL,
  `debut_date` date DEFAULT NULL,
  `date_birth` date DEFAULT NULL,
  `is_deceased` TEXT   NOT NULL DEFAULT 'n',
  `id_country` INTEGER  NOT NULL DEFAULT '114',
  `sales` INTEGER NOT NULL DEFAULT '0',
  `awards` INTEGER NOT NULL DEFAULT '0',
  `views` bigINTEGER NOT NULL DEFAULT '0',
  `pak_total` INTEGER NOT NULL DEFAULT '0',
  `gaondigital_times` INTEGER NOT NULL DEFAULT '0',
  `gaondigital_firsts` INTEGER NOT NULL DEFAULT '0',
  `yawards_total` INTEGER NOT NULL DEFAULT '0',
  `social` TEXT  NOT NULL DEFAULT '',
  `mslevel` INTEGER NOT NULL DEFAULT '1'
)
*/