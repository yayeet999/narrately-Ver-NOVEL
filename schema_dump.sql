

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."novel_chapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "novel_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chapter_number" integer NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."novel_chapters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."novel_generation_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "novel_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "current_chapter" integer DEFAULT 0 NOT NULL,
    "total_chapters" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT '''pending'''::"text" NOT NULL,
    "error_message" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."novel_generation_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."novels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "parameters" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."novels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temp_novel_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "novel_id" "uuid" NOT NULL,
    "data_type" "text" DEFAULT ''::"text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."temp_novel_data" OWNER TO "postgres";


ALTER TABLE ONLY "public"."novel_chapters"
    ADD CONSTRAINT "novel_chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."novel_generation_states"
    ADD CONSTRAINT "novel_generation_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."novels"
    ADD CONSTRAINT "novels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temp_novel_data"
    ADD CONSTRAINT "temp_novel_data_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "novel_chapters_novel_id_chapter_number_key" ON "public"."novel_chapters" USING "btree" ("novel_id", "chapter_number");



CREATE UNIQUE INDEX "temp_novel_data_novel_id_data_type_key" ON "public"."temp_novel_data" USING "btree" ("novel_id", "data_type");



ALTER TABLE ONLY "public"."novel_generation_states"
    ADD CONSTRAINT "fk_novel" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."novel_chapters"
    ADD CONSTRAINT "novel_chapters_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."novel_generation_states"
    ADD CONSTRAINT "novel_generation_states_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."novels"
    ADD CONSTRAINT "novels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."temp_novel_data"
    ADD CONSTRAINT "temp_novel_data_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE CASCADE;



CREATE POLICY "chapters_delete" ON "public"."novel_chapters" FOR DELETE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "chapters_insert" ON "public"."novel_chapters" FOR INSERT WITH CHECK (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "chapters_select" ON "public"."novel_chapters" FOR SELECT USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "chapters_update" ON "public"."novel_chapters" FOR UPDATE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"())))) WITH CHECK (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."novel_chapters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."novel_generation_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."novels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "novels_delete" ON "public"."novels" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "novels_insert" ON "public"."novels" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "novels_select" ON "public"."novels" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "novels_update" ON "public"."novels" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "state_delete" ON "public"."novel_generation_states" FOR DELETE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "state_insert" ON "public"."novel_generation_states" FOR INSERT WITH CHECK (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "state_select" ON "public"."novel_generation_states" FOR SELECT USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "state_update" ON "public"."novel_generation_states" FOR UPDATE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"())))) WITH CHECK (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "states_delete" ON "public"."novel_generation_states" FOR DELETE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "states_insert" ON "public"."novel_generation_states" FOR INSERT WITH CHECK (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "states_select" ON "public"."novel_generation_states" FOR SELECT USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "states_update" ON "public"."novel_generation_states" FOR UPDATE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "temp_data_delete" ON "public"."temp_novel_data" FOR DELETE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "temp_data_insert" ON "public"."temp_novel_data" FOR INSERT WITH CHECK (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "temp_data_select" ON "public"."temp_novel_data" FOR SELECT USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



CREATE POLICY "temp_data_update" ON "public"."temp_novel_data" FOR UPDATE USING (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"())))) WITH CHECK (("novel_id" IN ( SELECT "novels"."id"
   FROM "public"."novels"
  WHERE ("novels"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."temp_novel_data" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



































































































































































































GRANT ALL ON TABLE "public"."novel_chapters" TO "anon";
GRANT ALL ON TABLE "public"."novel_chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."novel_chapters" TO "service_role";



GRANT ALL ON TABLE "public"."novel_generation_states" TO "anon";
GRANT ALL ON TABLE "public"."novel_generation_states" TO "authenticated";
GRANT ALL ON TABLE "public"."novel_generation_states" TO "service_role";



GRANT ALL ON TABLE "public"."novels" TO "anon";
GRANT ALL ON TABLE "public"."novels" TO "authenticated";
GRANT ALL ON TABLE "public"."novels" TO "service_role";



GRANT ALL ON TABLE "public"."temp_novel_data" TO "anon";
GRANT ALL ON TABLE "public"."temp_novel_data" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_novel_data" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
