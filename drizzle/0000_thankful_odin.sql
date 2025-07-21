CREATE TABLE IF NOT EXISTS "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"season" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"period" integer,
	"time" varchar(10),
	"postseason" boolean DEFAULT false,
	"home_team_id" integer NOT NULL,
	"visitor_team_id" integer NOT NULL,
	"home_team_score" integer,
	"visitor_team_score" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"game_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"min" varchar(10),
	"fgm" integer,
	"fga" integer,
	"fg_pct" numeric(5, 3),
	"fg3m" integer,
	"fg3a" integer,
	"fg3_pct" numeric(5, 3),
	"ftm" integer,
	"fta" integer,
	"ft_pct" numeric(5, 3),
	"oreb" integer,
	"dreb" integer,
	"reb" integer,
	"ast" integer,
	"stl" integer,
	"blk" integer,
	"turnover" integer,
	"pf" integer,
	"pts" integer,
	"plus_minus" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(50) NOT NULL,
	"last_name" varchar(50) NOT NULL,
	"position" varchar(10),
	"height" varchar(10),
	"weight" varchar(10),
	"jersey_number" varchar(3),
	"college" varchar(100),
	"country" varchar(50),
	"draft_year" integer,
	"draft_round" integer,
	"draft_number" integer,
	"team_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prop_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"game_id" integer NOT NULL,
	"prop_type" varchar(20) NOT NULL,
	"prop_line" numeric(5, 1) NOT NULL,
	"actual_value" numeric(5, 1) NOT NULL,
	"over_under_result" varchar(5) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rolling_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"prop_type" varchar(20) NOT NULL,
	"games_count" integer NOT NULL,
	"average" numeric(5, 2) NOT NULL,
	"hit_rate_15" numeric(5, 2),
	"hit_rate_25" numeric(5, 2),
	"hit_rate_35" numeric(5, 2),
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"abbreviation" varchar(3) NOT NULL,
	"city" varchar(100) NOT NULL,
	"conference" varchar(10) NOT NULL,
	"division" varchar(20) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_date_idx" ON "games" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_season_idx" ON "games" ("season");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_teams_idx" ON "games" ("home_team_id","visitor_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_game_idx" ON "player_stats" ("player_id","game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_stats_player_idx" ON "player_stats" ("player_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_stats_game_idx" ON "player_stats" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_name_idx" ON "players" ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_team_idx" ON "players" ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_prop_idx" ON "prop_outcomes" ("player_id","prop_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prop_game_idx" ON "prop_outcomes" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rolling_splits_idx" ON "rolling_splits" ("player_id","prop_type","games_count");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_visitor_team_id_teams_id_fk" FOREIGN KEY ("visitor_team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prop_outcomes" ADD CONSTRAINT "prop_outcomes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prop_outcomes" ADD CONSTRAINT "prop_outcomes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rolling_splits" ADD CONSTRAINT "rolling_splits_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
