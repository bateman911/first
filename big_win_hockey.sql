--
-- PostgreSQL database dump
--

-- Dumped from database version 12.22 (Ubuntu 12.22-0ubuntu0.20.04.4)
-- Dumped by pg_dump version 12.22 (Ubuntu 12.22-0ubuntu0.20.04.4)

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

--
-- Name: card_rarity; Type: TYPE; Schema: public; Owner: big_win
--

CREATE TYPE public.card_rarity AS ENUM (
    'Common',
    'Rare',
    'Epic',
    'Legendary'
);


ALTER TYPE public.card_rarity OWNER TO big_win;

--
-- Name: hockey_position; Type: TYPE; Schema: public; Owner: big_win
--

CREATE TYPE public.hockey_position AS ENUM (
    'Forward',
    'Defenseman',
    'Goaltender'
);


ALTER TYPE public.hockey_position OWNER TO big_win;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: big_win
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO big_win;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: big_impact_card_templates; Type: TABLE; Schema: public; Owner: big_win
--

CREATE TABLE public.big_impact_card_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    card_type character varying(20) NOT NULL,
    image_url character varying(255),
    effect_details jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.big_impact_card_templates OWNER TO big_win;

--
-- Name: big_impact_card_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: big_win
--

CREATE SEQUENCE public.big_impact_card_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.big_impact_card_templates_id_seq OWNER TO big_win;

--
-- Name: big_impact_card_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: big_win
--

ALTER SEQUENCE public.big_impact_card_templates_id_seq OWNED BY public.big_impact_card_templates.id;


--
-- Name: cards; Type: TABLE; Schema: public; Owner: big_win
--

CREATE TABLE public.cards (
    id integer NOT NULL,
    player_name character varying(100) NOT NULL,
    image_url character varying(255) DEFAULT 'placeholder.png'::character varying,
    "position" public.hockey_position NOT NULL,
    rarity public.card_rarity DEFAULT 'Common'::public.card_rarity,
    base_attack integer DEFAULT 10,
    base_defense integer DEFAULT 10,
    base_speed integer DEFAULT 10,
    base_stamina integer DEFAULT 10,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cards OWNER TO big_win;

--
-- Name: cards_id_seq; Type: SEQUENCE; Schema: public; Owner: big_win
--

CREATE SEQUENCE public.cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cards_id_seq OWNER TO big_win;

--
-- Name: cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: big_win
--

ALTER SEQUENCE public.cards_id_seq OWNED BY public.cards.id;


--
-- Name: team_rosters; Type: TABLE; Schema: public; Owner: big_win
--

CREATE TABLE public.team_rosters (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_card_id integer NOT NULL,
    field_position character varying(50) NOT NULL
);


ALTER TABLE public.team_rosters OWNER TO big_win;

--
-- Name: team_rosters_id_seq; Type: SEQUENCE; Schema: public; Owner: big_win
--

CREATE SEQUENCE public.team_rosters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.team_rosters_id_seq OWNER TO big_win;

--
-- Name: team_rosters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: big_win
--

ALTER SEQUENCE public.team_rosters_id_seq OWNED BY public.team_rosters.id;


--
-- Name: user_big_impact_cards; Type: TABLE; Schema: public; Owner: big_win
--

CREATE TABLE public.user_big_impact_cards (
    id integer NOT NULL,
    user_id integer NOT NULL,
    template_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    acquired_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_big_impact_cards OWNER TO big_win;

--
-- Name: user_big_impact_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: big_win
--

CREATE SEQUENCE public.user_big_impact_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_big_impact_cards_id_seq OWNER TO big_win;

--
-- Name: user_big_impact_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: big_win
--

ALTER SEQUENCE public.user_big_impact_cards_id_seq OWNED BY public.user_big_impact_cards.id;


--
-- Name: user_cards; Type: TABLE; Schema: public; Owner: big_win
--

CREATE TABLE public.user_cards (
    id integer NOT NULL,
    user_id integer NOT NULL,
    card_template_id integer NOT NULL,
    current_level integer DEFAULT 1,
    experience_points integer DEFAULT 0,
    acquired_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_cards OWNER TO big_win;

--
-- Name: user_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: big_win
--

CREATE SEQUENCE public.user_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_cards_id_seq OWNER TO big_win;

--
-- Name: user_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: big_win
--

ALTER SEQUENCE public.user_cards_id_seq OWNED BY public.user_cards.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: big_win
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    provider character varying(50),
    provider_id character varying(255),
    current_energy integer DEFAULT 7,
    max_energy integer DEFAULT 7,
    next_energy_refill_at timestamp with time zone,
    team_name character varying(100),
    team_logo_url character varying(255),
    level integer DEFAULT 1,
    current_xp integer DEFAULT 0,
    xp_to_next_level integer DEFAULT 100,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    draws integer DEFAULT 0,
    rating character varying(50),
    gold integer DEFAULT 0,
    bucks integer DEFAULT 0,
    team_name_changes_count integer DEFAULT 0
);


ALTER TABLE public.users OWNER TO big_win;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: big_win
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO big_win;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: big_win
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: big_impact_card_templates id; Type: DEFAULT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.big_impact_card_templates ALTER COLUMN id SET DEFAULT nextval('public.big_impact_card_templates_id_seq'::regclass);


--
-- Name: cards id; Type: DEFAULT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.cards ALTER COLUMN id SET DEFAULT nextval('public.cards_id_seq'::regclass);


--
-- Name: team_rosters id; Type: DEFAULT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.team_rosters ALTER COLUMN id SET DEFAULT nextval('public.team_rosters_id_seq'::regclass);


--
-- Name: user_big_impact_cards id; Type: DEFAULT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_big_impact_cards ALTER COLUMN id SET DEFAULT nextval('public.user_big_impact_cards_id_seq'::regclass);


--
-- Name: user_cards id; Type: DEFAULT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_cards ALTER COLUMN id SET DEFAULT nextval('public.user_cards_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: big_impact_card_templates; Type: TABLE DATA; Schema: public; Owner: big_win
--

COPY public.big_impact_card_templates (id, name, description, card_type, image_url, effect_details, created_at) FROM stdin;
1	Tape-to-Tape	Позволяет игрокам отдавать более резкие и качественные пасы.	Синяя	bi_tape_to_tape.png	{"stat_boost": {"skill": "passing", "target": "team", "duration_type": "match_long", "value_percent": 15}}	2025-06-03 11:38:22.07907+03
2	Puck Luck	Повышает шанс забросить шайбу отскоком от штанги.	Золотая	bi_puck_luck.png	{"special_effect": "puck_luck", "chance_increase": 0.20}	2025-06-03 11:38:22.07907+03
3	Sharpshooter	Увеличивает точность бросков по воротам.	Синяя	bi_sharpshooter.png	{"stat_boost": {"skill": "shooting_accuracy", "target": "team", "duration_type": "match_long", "value_percent": 20}}	2025-06-03 12:18:05.598762+03
\.


--
-- Data for Name: cards; Type: TABLE DATA; Schema: public; Owner: big_win
--

COPY public.cards (id, player_name, image_url, "position", rarity, base_attack, base_defense, base_speed, base_stamina, description, created_at) FROM stdin;
1	Ivan Grozny	forward.png	Forward	Epic	85	70	75	80	Legend forward	2025-05-29 16:00:17.512776+03
3	Sergey Stena	defenseman.png	Defenseman	Rare	60	85	65	75	Good defensman	2025-05-29 16:04:59.37683+03
5	Alex Young	forward.png	Forward	Common	50	55	50	50	Young player (18 y.o.)	2025-05-29 16:08:05.847171+03
4	Victor Chezh	goaltender.png	Goaltender	Common	30	80	40	60	Goalkeeper	2025-05-29 16:06:34.560446+03
2	Petr Faster	forward.png	Forward	Rare	70	60	85	70	Speed forward	2025-05-29 16:02:41.7811+03
6	Alex Radulov	forward.png	Forward	Epic	85	80	85	75	Legend	2025-05-30 15:58:10.075356+03
7	Nikita Nesterov	defenseman.png	Defenseman	Epic	70	75	80	85	Legend	2025-05-30 15:59:51.12833+03
8	Sergei Mestnov	defenseman.png	Defenseman	Common	55	50	49	53	defens	2025-05-30 20:02:25.579706+03
9	Ilya Nabokov	goaltender.png	Goaltender	Rare	60	70	75	74	G	2025-05-30 20:03:30.180305+03
10	Alexei Ivanov	defenseman.png	Defenseman	Common	55	45	50	53	D	2025-05-30 20:04:38.379516+03
11	Fedor Petrov	forward.png	Forward	Common	60	55	56	50	CF	2025-05-30 20:05:27.579915+03
12	Daniil Isaev	goaltender.png	Goaltender	Epic	86	80	76	85	G	2025-05-30 20:06:32.360122+03
\.


--
-- Data for Name: team_rosters; Type: TABLE DATA; Schema: public; Owner: big_win
--

COPY public.team_rosters (id, user_id, user_card_id, field_position) FROM stdin;
25	2	5	LW
26	2	6	RW
27	2	4	G
28	4	11	LW
29	4	12	RW
30	4	10	RD
\.


--
-- Data for Name: user_big_impact_cards; Type: TABLE DATA; Schema: public; Owner: big_win
--

COPY public.user_big_impact_cards (id, user_id, template_id, quantity, acquired_at) FROM stdin;
1	7	1	2	2025-06-03 12:19:56.556308+03
2	7	2	1	2025-06-03 12:19:56.556308+03
3	7	3	3	2025-06-03 12:19:56.556308+03
\.


--
-- Data for Name: user_cards; Type: TABLE DATA; Schema: public; Owner: big_win
--

COPY public.user_cards (id, user_id, card_template_id, current_level, experience_points, acquired_at) FROM stdin;
1	1	1	1	0	2025-05-29 16:15:45.217398+03
2	1	2	1	0	2025-05-29 16:15:45.563828+03
3	1	3	1	0	2025-05-29 16:15:45.567747+03
4	2	4	1	0	2025-05-29 19:38:15.757826+03
5	2	5	1	0	2025-05-29 19:38:16.144129+03
6	2	2	1	0	2025-05-29 19:38:16.144637+03
7	6	2	1	0	2025-05-29 22:11:33.30293+03
8	6	4	1	0	2025-05-29 22:11:33.645641+03
9	6	3	1	0	2025-05-29 22:11:33.646301+03
10	4	3	1	0	2025-05-29 22:11:46.600798+03
11	4	1	1	0	2025-05-29 22:11:46.97504+03
12	4	2	1	0	2025-05-29 22:11:46.976038+03
13	7	10	1	0	2025-06-01 23:22:31.258622+03
14	7	4	1	0	2025-06-01 23:22:31.72242+03
15	7	3	1	0	2025-06-01 23:22:31.724078+03
16	8	12	1	0	2025-06-01 23:24:56.551178+03
17	8	10	1	0	2025-06-01 23:24:56.70525+03
18	8	3	1	0	2025-06-01 23:24:56.858475+03
19	8	5	1	0	2025-06-01 23:24:57.011233+03
20	8	11	1	0	2025-06-01 23:24:57.165829+03
21	8	6	1	0	2025-06-01 23:24:57.318772+03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: big_win
--

COPY public.users (id, username, email, password_hash, created_at, provider, provider_id, current_energy, max_energy, next_energy_refill_at, team_name, team_logo_url, level, current_xp, xp_to_next_level, wins, losses, draws, rating, gold, bucks, team_name_changes_count) FROM stdin;
1	test	support@netutils.online	$2b$10$LtM6y7UavLnyA6NewhWYbeuCrsrgftUdJkFXUsDOM5geiVrA4MJwS	2025-05-27 23:57:36.20889+03	\N	\N	7	7	\N	\N	\N	1	0	100	0	0	0	\N	0	0	0
5	lelih	lelih737@gmail.com	\N	2025-05-29 20:19:13.0381+03	google	115144012312621338039	7	7	\N	\N	\N	1	0	100	0	0	0	\N	0	0	0
6	test3	test3@mail.ru	$2b$10$O4R7b4g1ApBXnh53lLSem.GsEUC8DuTYRbun0cMlISPinUo0w0CSW	2025-05-29 22:07:01.852808+03	\N	\N	7	7	\N	\N	\N	1	0	100	0	0	0	\N	0	0	0
2	test2	test@test.ru	$2b$10$nmC3PmC/brKPrFV3haNEEOQdfqBYnX1acQefsSLWwpQnRoY.eFuEq	2025-05-29 19:35:11.246102+03	\N	\N	7	7	\N	\N	\N	1	0	100	0	0	0	58	0	0	0
8	test5	test5@test.ru	$2b$10$VcLMrO6KvzpNr/4TeDRDQuLQjUzKRfk3tx4l9GGg1ND3mTTZ1tT9m	2025-06-01 23:24:43.85811+03	\N	\N	7	7	\N	123	\N	1	0	100	0	0	0	65	0	0	0
4	equalizer	yarik111299@gmail.com	\N	2025-05-29 20:17:00.904874+03	google	106795062126712161759	7	7	\N	test2	\N	1	0	100	0	0	0	73	0	0	1
7	test4	test2@mail.ru	$2b$10$/6gCGJ.CAL.7Q4hC54qgxuNm5bwUOtewoXT3zTARG.NuSjo7SKTza	2025-06-01 23:22:03.209468+03	\N	\N	7	7	\N	eq2	\N	1	0	100	0	0	0	58	0	0	1
\.


--
-- Name: big_impact_card_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: big_win
--

SELECT pg_catalog.setval('public.big_impact_card_templates_id_seq', 3, true);


--
-- Name: cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: big_win
--

SELECT pg_catalog.setval('public.cards_id_seq', 12, true);


--
-- Name: team_rosters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: big_win
--

SELECT pg_catalog.setval('public.team_rosters_id_seq', 30, true);


--
-- Name: user_big_impact_cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: big_win
--

SELECT pg_catalog.setval('public.user_big_impact_cards_id_seq', 3, true);


--
-- Name: user_cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: big_win
--

SELECT pg_catalog.setval('public.user_cards_id_seq', 21, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: big_win
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: big_impact_card_templates big_impact_card_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.big_impact_card_templates
    ADD CONSTRAINT big_impact_card_templates_name_key UNIQUE (name);


--
-- Name: big_impact_card_templates big_impact_card_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.big_impact_card_templates
    ADD CONSTRAINT big_impact_card_templates_pkey PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: team_rosters team_rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT team_rosters_pkey PRIMARY KEY (id);


--
-- Name: team_rosters unique_user_card_in_roster; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT unique_user_card_in_roster UNIQUE (user_id, user_card_id);


--
-- Name: team_rosters unique_user_position; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT unique_user_position UNIQUE (user_id, field_position);


--
-- Name: user_big_impact_cards user_big_impact_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_big_impact_cards
    ADD CONSTRAINT user_big_impact_cards_pkey PRIMARY KEY (id);


--
-- Name: user_big_impact_cards user_big_impact_cards_user_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_big_impact_cards
    ADD CONSTRAINT user_big_impact_cards_user_id_template_id_key UNIQUE (user_id, template_id);


--
-- Name: user_cards user_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_cards
    ADD CONSTRAINT user_cards_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_team_name_key; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_name_key UNIQUE (team_name);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_team_rosters_user_card_id; Type: INDEX; Schema: public; Owner: big_win
--

CREATE INDEX idx_team_rosters_user_card_id ON public.team_rosters USING btree (user_card_id);


--
-- Name: idx_team_rosters_user_id; Type: INDEX; Schema: public; Owner: big_win
--

CREATE INDEX idx_team_rosters_user_id ON public.team_rosters USING btree (user_id);


--
-- Name: idx_team_rosters_user_id_position; Type: INDEX; Schema: public; Owner: big_win
--

CREATE INDEX idx_team_rosters_user_id_position ON public.team_rosters USING btree (user_id, field_position);


--
-- Name: idx_user_bi_cards_user_id; Type: INDEX; Schema: public; Owner: big_win
--

CREATE INDEX idx_user_bi_cards_user_id ON public.user_big_impact_cards USING btree (user_id);


--
-- Name: idx_user_cards_card_template_id; Type: INDEX; Schema: public; Owner: big_win
--

CREATE INDEX idx_user_cards_card_template_id ON public.user_cards USING btree (card_template_id);


--
-- Name: idx_user_cards_user_id; Type: INDEX; Schema: public; Owner: big_win
--

CREATE INDEX idx_user_cards_user_id ON public.user_cards USING btree (user_id);


--
-- Name: idx_users_team_name_lower_unique; Type: INDEX; Schema: public; Owner: big_win
--

CREATE UNIQUE INDEX idx_users_team_name_lower_unique ON public.users USING btree (lower((team_name)::text)) WHERE (team_name IS NOT NULL);


--
-- Name: team_rosters update_team_rosters_modtime; Type: TRIGGER; Schema: public; Owner: big_win
--

CREATE TRIGGER update_team_rosters_modtime BEFORE UPDATE ON public.team_rosters FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: team_rosters team_rosters_user_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT team_rosters_user_card_id_fkey FOREIGN KEY (user_card_id) REFERENCES public.user_cards(id) ON DELETE CASCADE;


--
-- Name: team_rosters team_rosters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT team_rosters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_big_impact_cards user_big_impact_cards_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_big_impact_cards
    ADD CONSTRAINT user_big_impact_cards_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.big_impact_card_templates(id) ON DELETE CASCADE;


--
-- Name: user_big_impact_cards user_big_impact_cards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_big_impact_cards
    ADD CONSTRAINT user_big_impact_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_cards user_cards_card_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_cards
    ADD CONSTRAINT user_cards_card_template_id_fkey FOREIGN KEY (card_template_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: user_cards user_cards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: big_win
--

ALTER TABLE ONLY public.user_cards
    ADD CONSTRAINT user_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

