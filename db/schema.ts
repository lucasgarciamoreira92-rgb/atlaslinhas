import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,uniqueIndex,index,check} from 'drizzle-orm/sqlite-core';
export const lines=sqliteTable('lines',{id:text('id').primaryKey(),number:text('number').notNull(),deviceId:text('device_id'),slot:text('slot'),data:text('data').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[uniqueIndex('idx_lines_number').on(t.number),uniqueIndex('idx_lines_device_slot').on(t.deviceId,t.slot)]);
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),data:text('data').notNull(),version:integer('version').notNull().default(1)});
export const history=sqliteTable('history',{id:text('id').primaryKey(),lineId:text('line_id').notNull(),version:integer('version').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),detail:text('detail')},t=>[index('idx_history_line_date').on(t.lineId,t.createdAt,t.id)]);

export const members=sqliteTable('members',{email:text('email').primaryKey(),userId:text('user_id'),name:text('name').notNull(),role:text('role').notNull(),active:integer('active').notNull().default(1),isOwner:integer('is_owner').notNull().default(0),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[uniqueIndex('idx_members_user').on(t.userId)]);

export const storageRevision=sqliteTable('storage_revision',{id:text('id').primaryKey(),revision:integer('revision').notNull().default(0)});
export const backups=sqliteTable('backups',{id:text('id').primaryKey(),objectKey:text('object_key').notNull(),kind:text('kind').notNull(),createdAt:text('created_at').notNull(),actor:text('actor').notNull(),lineCount:integer('line_count').notNull(),historyCount:integer('history_count').notNull(),sourceDate:text('source_date').notNull(),revision:integer('revision').notNull()},t=>[check('backup_revision_valid',sql`${t.revision} >= 0`),index('idx_backups_date').on(t.createdAt,t.id)]);
