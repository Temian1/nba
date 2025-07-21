import { pgTable, serial, varchar, integer, decimal, timestamp, boolean, text, index, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table for authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  first_name: varchar('first_name', { length: 50 }),
  last_name: varchar('last_name', { length: 50 }),
  role: varchar('role', { length: 20 }).default('user'), // 'user', 'admin'
  is_active: boolean('is_active').default(true),
  email_verified: boolean('email_verified').default(false),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    emailIdx: index('user_email_idx').on(table.email)
  };
});

// User sessions table for JWT token management
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  token_hash: varchar('token_hash', { length: 255 }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  last_used: timestamp('last_used').defaultNow()
}, (table) => {
  return {
    userIdx: index('session_user_idx').on(table.user_id),
    tokenIdx: index('session_token_idx').on(table.token_hash)
  };
});

// Teams table
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 3 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  conference: varchar('conference', { length: 10 }).notNull(),
  division: varchar('division', { length: 20 }).notNull(),
  full_name: varchar('full_name', { length: 150 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Players table
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  first_name: varchar('first_name', { length: 50 }).notNull(),
  last_name: varchar('last_name', { length: 50 }).notNull(),
  position: varchar('position', { length: 10 }),
  height: varchar('height', { length: 10 }),
  weight: varchar('weight', { length: 10 }),
  jersey_number: varchar('jersey_number', { length: 3 }),
  college: varchar('college', { length: 100 }),
  country: varchar('country', { length: 50 }),
  draft_year: integer('draft_year'),
  draft_round: integer('draft_round'),
  draft_number: integer('draft_number'),
  team_id: integer('team_id').references(() => teams.id),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    nameIdx: index('player_name_idx').on(table.first_name, table.last_name),
    teamIdx: index('player_team_idx').on(table.team_id)
  };
});

// Games table
export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  date: timestamp('date').notNull(),
  season: integer('season').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  period: integer('period'),
  time: varchar('time', { length: 10 }),
  postseason: boolean('postseason').default(false),
  home_team_id: integer('home_team_id').references(() => teams.id).notNull(),
  visitor_team_id: integer('visitor_team_id').references(() => teams.id).notNull(),
  home_team_score: integer('home_team_score'),
  visitor_team_score: integer('visitor_team_score'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    dateIdx: index('game_date_idx').on(table.date),
    seasonIdx: index('game_season_idx').on(table.season),
    teamsIdx: index('game_teams_idx').on(table.home_team_id, table.visitor_team_id)
  };
});

// Player stats table
export const playerStats = pgTable('player_stats', {
  id: serial('id').primaryKey(),
  player_id: integer('player_id').references(() => players.id).notNull(),
  game_id: integer('game_id').references(() => games.id).notNull(),
  team_id: integer('team_id').references(() => teams.id).notNull(),
  min: varchar('min', { length: 10 }), // minutes played
  fgm: integer('fgm'), // field goals made
  fga: integer('fga'), // field goals attempted
  fg_pct: decimal('fg_pct', { precision: 5, scale: 3 }),
  fg3m: integer('fg3m'), // 3-point field goals made
  fg3a: integer('fg3a'), // 3-point field goals attempted
  fg3_pct: decimal('fg3_pct', { precision: 5, scale: 3 }),
  ftm: integer('ftm'), // free throws made
  fta: integer('fta'), // free throws attempted
  ft_pct: decimal('ft_pct', { precision: 5, scale: 3 }),
  oreb: integer('oreb'), // offensive rebounds
  dreb: integer('dreb'), // defensive rebounds
  reb: integer('reb'), // total rebounds
  ast: integer('ast'), // assists
  stl: integer('stl'), // steals
  blk: integer('blk'), // blocks
  turnover: integer('turnover'), // turnovers
  pf: integer('pf'), // personal fouls
  pts: integer('pts'), // points
  plus_minus: integer('plus_minus'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    playerGameIdx: index('player_game_idx').on(table.player_id, table.game_id),
    playerIdx: index('player_stats_player_idx').on(table.player_id),
    gameIdx: index('player_stats_game_idx').on(table.game_id)
  };
});

// Prop outcomes table for storing calculated over/under results
export const propOutcomes = pgTable('prop_outcomes', {
  id: serial('id').primaryKey(),
  player_id: integer('player_id').references(() => players.id).notNull(),
  game_id: integer('game_id').references(() => games.id).notNull(),
  prop_type: varchar('prop_type', { length: 20 }).notNull(), // pts, reb, ast, stl, blk, turnover, pra
  prop_line: decimal('prop_line', { precision: 5, scale: 1 }).notNull(),
  actual_value: decimal('actual_value', { precision: 5, scale: 1 }).notNull(),
  over_under_result: varchar('over_under_result', { length: 5 }).notNull(), // 'over' or 'under'
  created_at: timestamp('created_at').defaultNow()
}, (table) => {
  return {
    playerPropIdx: index('player_prop_idx').on(table.player_id, table.prop_type),
    gameIdx: index('prop_game_idx').on(table.game_id)
  };
});

// Rolling splits table for precomputed statistics
export const rollingSplits = pgTable('rolling_splits', {
  id: serial('id').primaryKey(),
  player_id: integer('player_id').references(() => players.id).notNull(),
  prop_type: varchar('prop_type', { length: 20 }).notNull(),
  games_count: integer('games_count').notNull(), // 5, 10, 20
  average: decimal('average', { precision: 5, scale: 2 }).notNull(),
  hit_rate_15: decimal('hit_rate_15', { precision: 5, scale: 2 }), // hit rate for 1.5 line
  hit_rate_25: decimal('hit_rate_25', { precision: 5, scale: 2 }), // hit rate for 2.5 line
  hit_rate_35: decimal('hit_rate_35', { precision: 5, scale: 2 }), // hit rate for 3.5 line
  last_updated: timestamp('last_updated').defaultNow(),
  created_at: timestamp('created_at').defaultNow()
}, (table) => {
  return {
    playerPropGamesIdx: index('rolling_splits_idx').on(table.player_id, table.prop_type, table.games_count)
  };
});

// Relations
export const teamsRelations = relations(teams, ({ many }) => ({
  players: many(players),
  homeGames: many(games, { relationName: 'homeTeam' }),
  awayGames: many(games, { relationName: 'awayTeam' })
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.team_id],
    references: [teams.id]
  }),
  stats: many(playerStats),
  propOutcomes: many(propOutcomes),
  rollingSplits: many(rollingSplits)
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  homeTeam: one(teams, {
    fields: [games.home_team_id],
    references: [teams.id],
    relationName: 'homeTeam'
  }),
  visitorTeam: one(teams, {
    fields: [games.visitor_team_id],
    references: [teams.id],
    relationName: 'awayTeam'
  }),
  playerStats: many(playerStats),
  propOutcomes: many(propOutcomes)
}));

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
  player: one(players, {
    fields: [playerStats.player_id],
    references: [players.id]
  }),
  game: one(games, {
    fields: [playerStats.game_id],
    references: [games.id]
  }),
  team: one(teams, {
    fields: [playerStats.team_id],
    references: [teams.id]
  })
}));

export const propOutcomesRelations = relations(propOutcomes, ({ one }) => ({
  player: one(players, {
    fields: [propOutcomes.player_id],
    references: [players.id]
  }),
  game: one(games, {
    fields: [propOutcomes.game_id],
    references: [games.id]
  })
}));

export const rollingSplitsRelations = relations(rollingSplits, ({ one }) => ({
  player: one(players, {
    fields: [rollingSplits.player_id],
    references: [players.id]
  })
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions)
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.user_id],
    references: [users.id]
  })
}));

// Export types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type PlayerStat = typeof playerStats.$inferSelect;
export type NewPlayerStat = typeof playerStats.$inferInsert;
export type PropOutcome = typeof propOutcomes.$inferSelect;
export type NewPropOutcome = typeof propOutcomes.$inferInsert;
export type RollingSplit = typeof rollingSplits.$inferSelect;
export type NewRollingSplit = typeof rollingSplits.$inferInsert;