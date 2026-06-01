/** MariaDB — shares MySQL syntax; distinct id so it uses the MariaDB type catalog. */
import type { DialectId } from '../../model/types';
import { MySqlDialect } from './mysql';

export class MariaDbDialect extends MySqlDialect {
  readonly id: DialectId = 'mariadb';
}
