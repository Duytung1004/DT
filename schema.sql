--
-- PostgreSQL database dump
--

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public 

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ai_trang_thai; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ai_trang_thai AS ENUM (
    'cho_xu_ly',
    'dang_xu_ly',
    'hoan_thanh',
    'that_bai'
);


ALTER TYPE public.ai_trang_thai 

--
-- Name: che_do_tien_do; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.che_do_tien_do AS ENUM (
    'trang_thai',
    'kpi',
    'ca_hai'
);


ALTER TYPE public.che_do_tien_do 

--
-- Name: entity_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.entity_type_enum AS ENUM (
    'users',
    'tasks',
    'documents',
    'messages',
    'conversations',
    'notifications',
    'trash'
);


ALTER TYPE public.entity_type_enum 

--
-- Name: hanh_dong_audit; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.hanh_dong_audit AS ENUM (
    'create',
    'update',
    'delete',
    'submit',
    'approve',
    'reject',
    'restore',
    'login',
    'logout'
);


ALTER TYPE public.hanh_dong_audit 

--
-- Name: loai_thong_bao; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loai_thong_bao AS ENUM (
    'task_assigned',
    'task_updated',
    'task_submitted',
    'task_approved',
    'task_rejected',
    'task_overdue',
    'chat_message',
    'system',
    'task_assigned_unit',
    'task_assigned_user',
    'task_approved_level1',
    'task_approved_level2',
    'subtask_assigned',
    'subtask_approved',
    'subtask_rejected',
    'document_created',
    'subtask_submitted',
    'subtask_periodic_report',
    'task_periodic_report',
    'subtask_started',
    'subtask_revision_requested',
    'task_sent_to_leader',
    'document_submitted_for_review',
    'document_office_approved',
    'document_office_rejected',
    'document_sent_to_leader'
);


ALTER TYPE public.loai_thong_bao 

--
-- Name: muc_do_uu_tien; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.muc_do_uu_tien AS ENUM (
    'thap',
    'trung_binh',
    'cao',
    'khan'
);


ALTER TYPE public.muc_do_uu_tien 

--
-- Name: quyet_dinh_duyet; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.quyet_dinh_duyet AS ENUM (
    'chap_thuan',
    'tu_choi',
    'yeu_cau_bo_sung'
);


ALTER TYPE public.quyet_dinh_duyet 

--
-- Name: fn_audit_log(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_audit_log() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO audit_logs(entity_type, entity_id, action, old_values, new_values)
  VALUES (
    TG_TABLE_NAME::entity_type_enum,
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
    END::hanh_dong_audit,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_audit_log() 

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_conversations (
    id integer NOT NULL,
    user_id integer,
    question text NOT NULL,
    answer text NOT NULL,
    source_type character varying(50),
    source_refs jsonb,
    is_answered boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_conversations 

--
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_conversations_id_seq 

--
-- Name: ai_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_conversations_id_seq OWNED BY public.ai_conversations.id;


--
-- Name: ai_knowledge_base; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_knowledge_base (
    id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    topic character varying(100),
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_knowledge_base 

--
-- Name: ai_knowledge_base_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_knowledge_base_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_knowledge_base_id_seq 

--
-- Name: ai_knowledge_base_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_knowledge_base_id_seq OWNED BY public.ai_knowledge_base.id;


--
-- Name: ai_unanswered_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_unanswered_questions (
    id integer NOT NULL,
    user_id integer,
    question text NOT NULL,
    reason text,
    status character varying(30) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    answered_at timestamp without time zone
);


ALTER TABLE public.ai_unanswered_questions 

--
-- Name: ai_unanswered_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_unanswered_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_unanswered_questions_id_seq 

--
-- Name: ai_unanswered_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_unanswered_questions_id_seq OWNED BY public.ai_unanswered_questions.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    entity_type public.entity_type_enum,
    entity_id bigint,
    action public.hanh_dong_audit,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone DEFAULT now(),
    user_id bigint,
    description text,
    ip_address character varying(100),
    user_agent text
);


ALTER TABLE public.audit_logs 

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq 

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: conversation_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_members (
    id integer NOT NULL,
    conversation_id integer,
    user_id integer,
    role character varying(20) DEFAULT 'member'::character varying,
    is_active boolean DEFAULT false,
    unread_count integer DEFAULT 0
);


ALTER TABLE public.conversation_members 

--
-- Name: conversation_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversation_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversation_members_id_seq 

--
-- Name: conversation_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversation_members_id_seq OWNED BY public.conversation_members.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    task_id integer,
    created_by integer,
    type text DEFAULT 'task'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    title text,
    scope text
);


ALTER TABLE public.conversations 

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq 

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: document_priorities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_priorities (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.document_priorities 

--
-- Name: document_priorities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_priorities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_priorities_id_seq 

--
-- Name: document_priorities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_priorities_id_seq OWNED BY public.document_priorities.id;


--
-- Name: document_security_levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_security_levels (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.document_security_levels 

--
-- Name: document_security_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_security_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_security_levels_id_seq 

--
-- Name: document_security_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_security_levels_id_seq OWNED BY public.document_security_levels.id;


--
-- Name: document_source_levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_source_levels (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text
);


ALTER TABLE public.document_source_levels 

--
-- Name: document_source_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_source_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_source_levels_id_seq 

--
-- Name: document_source_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_source_levels_id_seq OWNED BY public.document_source_levels.id;


--
-- Name: document_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_types (
    id integer NOT NULL,
    code character varying(50),
    name character varying(255) NOT NULL,
    priority_weight integer DEFAULT 10
);


ALTER TABLE public.document_types 

--
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_types_id_seq 

--
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    so_ky_hieu character varying(100),
    tieu_de text NOT NULL,
    trich_yeu text,
    loai_van_ban_id integer,
    muc_do_uu_tien character varying(50),
    muc_do_bao_mat character varying(50),
    don_vi_ban_hanh text,
    nguoi_ky text,
    ngay_ban_hanh date,
    ngay_nhan date,
    han_xu_ly date,
    file_name text,
    file_path text,
    file_type text,
    created_by integer,
    unit_id integer,
    status character varying(50) DEFAULT 'moi'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    cap_ban_hanh character varying(50),
    workflow_status character varying(50) DEFAULT 'draft'::character varying,
    office_reviewer_id integer,
    office_reviewed_at timestamp without time zone,
    office_review_note text,
    sent_to_leader_at timestamp without time zone,
    submitted_to_office_at timestamp without time zone,
    leader_received_at timestamp without time zone,
    archived_at timestamp without time zone
);


ALTER TABLE public.documents 

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq 

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: employee_periodic_report_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_periodic_report_items (
    id integer NOT NULL,
    report_id integer NOT NULL,
    task_id integer NOT NULL,
    subtask_id integer NOT NULL,
    subtask_title text,
    subtask_status character varying(50),
    progress_snapshot integer DEFAULT 0,
    note text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.employee_periodic_report_items 

--
-- Name: employee_periodic_report_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_periodic_report_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_periodic_report_items_id_seq 

--
-- Name: employee_periodic_report_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_periodic_report_items_id_seq OWNED BY public.employee_periodic_report_items.id;


--
-- Name: employee_periodic_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_periodic_reports (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    reporter_id integer NOT NULL,
    period_key character varying(50) NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    han_bao_cao date,
    noi_dung text NOT NULL,
    kho_khan text,
    de_xuat text,
    tong_phan_viec integer DEFAULT 0,
    so_hoan_thanh integer DEFAULT 0,
    so_dang_thuc_hien integer DEFAULT 0,
    so_cho_duyet integer DEFAULT 0,
    so_qua_han integer DEFAULT 0,
    ti_le_hoan_thanh integer DEFAULT 0,
    file_name text,
    file_path text,
    file_type text,
    report_status character varying(50) DEFAULT 'submitted'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.employee_periodic_reports 

--
-- Name: employee_periodic_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_periodic_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_periodic_reports_id_seq 

--
-- Name: employee_periodic_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_periodic_reports_id_seq OWNED BY public.employee_periodic_reports.id;


--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_attachments (
    id integer NOT NULL,
    message_id integer,
    file_path text NOT NULL
);


ALTER TABLE public.message_attachments 

--
-- Name: message_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_attachments_id_seq 

--
-- Name: message_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_attachments_id_seq OWNED BY public.message_attachments.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer,
    sender_id integer,
    content text,
    edited_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    role character varying(20),
    file_name text,
    file_url text,
    file_type text
);


ALTER TABLE public.messages 

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq 

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    type public.loai_thong_bao,
    title text,
    created_at timestamp with time zone DEFAULT now(),
    is_read boolean DEFAULT false,
    task_id integer,
    content text,
    document_id integer
);


ALTER TABLE public.notifications 

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq 

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    permission character varying(100)
);


ALTER TABLE public.role_permissions 

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq 

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.roles 

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq 

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_logs (
    id integer NOT NULL,
    user_id integer,
    username character varying(100),
    action character varying(100) NOT NULL,
    status character varying(50),
    ip_address character varying(100),
    user_agent text,
    message text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.security_logs 

--
-- Name: security_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_logs_id_seq 

--
-- Name: security_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_logs_id_seq OWNED BY public.security_logs.id;


--
-- Name: subtask_periodic_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subtask_periodic_reports (
    id integer NOT NULL,
    subtask_id integer NOT NULL,
    task_id integer NOT NULL,
    reporter_id integer NOT NULL,
    noi_dung text NOT NULL,
    ti_le_hoan_thanh integer DEFAULT 0,
    ky_bao_cao_tu date,
    ky_bao_cao_den date,
    han_bao_cao date,
    file_name text,
    file_path text,
    file_type text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    period_key character varying(50),
    status_snapshot character varying(50),
    kho_khan text,
    de_xuat text,
    report_status character varying(50) DEFAULT 'submitted'::character varying
);


ALTER TABLE public.subtask_periodic_reports 

--
-- Name: subtask_periodic_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subtask_periodic_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subtask_periodic_reports_id_seq 

--
-- Name: subtask_periodic_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subtask_periodic_reports_id_seq OWNED BY public.subtask_periodic_reports.id;


--
-- Name: subtasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subtasks (
    id integer NOT NULL,
    task_id integer,
    assignee_user_id integer,
    tieu_de text,
    kpi_phan_tram integer,
    created_at timestamp with time zone DEFAULT now(),
    mo_ta text,
    han_chot timestamp without time zone,
    trang_thai character varying(50) DEFAULT 'cho_nhan_viec'::character varying,
    created_by integer,
    updated_at timestamp without time zone DEFAULT now(),
    noi_dung_nop text,
    file_name text,
    file_path text,
    submitted_at timestamp without time zone,
    kpi_score integer,
    file_type text,
    completed_at timestamp without time zone
);


ALTER TABLE public.subtasks 

--
-- Name: subtasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subtasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subtasks_id_seq 

--
-- Name: subtasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subtasks_id_seq OWNED BY public.subtasks.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings 

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq 

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: task_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_approvals (
    id integer NOT NULL,
    task_id integer,
    approver_id integer,
    quyet_dinh public.quyet_dinh_duyet,
    ghi_chu text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.task_approvals 

--
-- Name: task_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_approvals_id_seq 

--
-- Name: task_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_approvals_id_seq OWNED BY public.task_approvals.id;


--
-- Name: task_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_documents (
    id integer NOT NULL,
    task_id integer,
    document_id integer,
    relation_type character varying(50) DEFAULT 'dinh_kem'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.task_documents 

--
-- Name: task_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_documents_id_seq 

--
-- Name: task_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_documents_id_seq OWNED BY public.task_documents.id;


--
-- Name: task_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_logs (
    id integer NOT NULL,
    task_id integer,
    user_id integer,
    action text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.task_logs 

--
-- Name: task_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_logs_id_seq 

--
-- Name: task_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_logs_id_seq OWNED BY public.task_logs.id;


--
-- Name: task_periodic_report_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_periodic_report_items (
    id integer NOT NULL,
    report_id integer NOT NULL,
    task_id integer NOT NULL,
    task_title text,
    status_snapshot character varying(100),
    progress_snapshot integer DEFAULT 0,
    deadline_snapshot timestamp without time zone,
    note text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.task_periodic_report_items 

--
-- Name: task_periodic_report_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_periodic_report_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_periodic_report_items_id_seq 

--
-- Name: task_periodic_report_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_periodic_report_items_id_seq OWNED BY public.task_periodic_report_items.id;


--
-- Name: task_periodic_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_periodic_reports (
    id integer NOT NULL,
    task_id integer,
    reporter_id integer NOT NULL,
    report_type character varying(50) DEFAULT 'unit_to_leader'::character varying,
    noi_dung text NOT NULL,
    ti_le_hoan_thanh integer DEFAULT 0,
    ky_bao_cao_tu date,
    ky_bao_cao_den date,
    han_bao_cao date,
    file_name text,
    file_path text,
    file_type text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    period_key character varying(50),
    status_snapshot character varying(50),
    kho_khan text,
    de_xuat text,
    report_status character varying(50) DEFAULT 'submitted'::character varying,
    unit_id integer
);


ALTER TABLE public.task_periodic_reports 

--
-- Name: task_periodic_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_periodic_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_periodic_reports_id_seq 

--
-- Name: task_periodic_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_periodic_reports_id_seq OWNED BY public.task_periodic_reports.id;


--
-- Name: task_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_submissions (
    id integer NOT NULL,
    task_id integer,
    submitted_by integer,
    noi_dung_tom_tat text,
    created_at timestamp with time zone DEFAULT now(),
    file_name text,
    file_path text,
    file_type text
);


ALTER TABLE public.task_submissions 

--
-- Name: task_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_submissions_id_seq 

--
-- Name: task_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_submissions_id_seq OWNED BY public.task_submissions.id;


--
-- Name: task_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_updates (
    id integer NOT NULL,
    task_id integer,
    user_id integer,
    noi_dung text,
    trang_thai_sau text,
    kpi_sau integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.task_updates 

--
-- Name: task_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_updates_id_seq 

--
-- Name: task_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_updates_id_seq OWNED BY public.task_updates.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    unit_id integer,
    assignee_user_id integer,
    tieu_de text NOT NULL,
    mo_ta text,
    muc_do public.muc_do_uu_tien DEFAULT 'trung_binh'::public.muc_do_uu_tien,
    han_chot date,
    kpi_phan_tram integer,
    che_do_tien_do public.che_do_tien_do DEFAULT 'trang_thai'::public.che_do_tien_do,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    lanh_dao_id integer,
    signed_by integer,
    signed_at timestamp without time zone,
    signature_type character varying(50),
    status character varying(50) DEFAULT 'pending'::character varying,
    trang_thai_id integer,
    chu_ky_bao_cao character varying(50) DEFAULT 'mot_lan'::character varying,
    priority_score integer DEFAULT 0,
    priority_level character varying(30) DEFAULT 'binh_thuong'::character varying,
    priority_reason text,
    completed_at timestamp without time zone,
    archived_at timestamp without time zone,
    CONSTRAINT tasks_kpi_phan_tram_check CHECK (((kpi_phan_tram IS NULL) OR ((kpi_phan_tram >= 0) AND (kpi_phan_tram <= 100))))
);


ALTER TABLE public.tasks 

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq 

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: trang_thai_task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trang_thai_task (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.trang_thai_task 

--
-- Name: trang_thai_task_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trang_thai_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trang_thai_task_id_seq 

--
-- Name: trang_thai_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trang_thai_task_id_seq OWNED BY public.trang_thai_task.id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


ALTER TABLE public.units 

--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.units_id_seq 

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(150),
    password text NOT NULL,
    full_name character varying(150),
    role_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    chuc_vu character varying(50),
    unit_id integer NOT NULL,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    must_change_password boolean DEFAULT false
);


ALTER TABLE public.users 

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq 

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations ALTER COLUMN id SET DEFAULT nextval('public.ai_conversations_id_seq'::regclass);


--
-- Name: ai_knowledge_base id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_knowledge_base ALTER COLUMN id SET DEFAULT nextval('public.ai_knowledge_base_id_seq'::regclass);


--
-- Name: ai_unanswered_questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_unanswered_questions ALTER COLUMN id SET DEFAULT nextval('public.ai_unanswered_questions_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: conversation_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members ALTER COLUMN id SET DEFAULT nextval('public.conversation_members_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: document_priorities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_priorities ALTER COLUMN id SET DEFAULT nextval('public.document_priorities_id_seq'::regclass);


--
-- Name: document_security_levels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_security_levels ALTER COLUMN id SET DEFAULT nextval('public.document_security_levels_id_seq'::regclass);


--
-- Name: document_source_levels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_source_levels ALTER COLUMN id SET DEFAULT nextval('public.document_source_levels_id_seq'::regclass);


--
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: employee_periodic_report_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_report_items ALTER COLUMN id SET DEFAULT nextval('public.employee_periodic_report_items_id_seq'::regclass);


--
-- Name: employee_periodic_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_reports ALTER COLUMN id SET DEFAULT nextval('public.employee_periodic_reports_id_seq'::regclass);


--
-- Name: message_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments ALTER COLUMN id SET DEFAULT nextval('public.message_attachments_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: security_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_logs ALTER COLUMN id SET DEFAULT nextval('public.security_logs_id_seq'::regclass);


--
-- Name: subtask_periodic_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtask_periodic_reports ALTER COLUMN id SET DEFAULT nextval('public.subtask_periodic_reports_id_seq'::regclass);


--
-- Name: subtasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtasks ALTER COLUMN id SET DEFAULT nextval('public.subtasks_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: task_approvals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_approvals ALTER COLUMN id SET DEFAULT nextval('public.task_approvals_id_seq'::regclass);


--
-- Name: task_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_documents ALTER COLUMN id SET DEFAULT nextval('public.task_documents_id_seq'::regclass);


--
-- Name: task_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_logs ALTER COLUMN id SET DEFAULT nextval('public.task_logs_id_seq'::regclass);


--
-- Name: task_periodic_report_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_report_items ALTER COLUMN id SET DEFAULT nextval('public.task_periodic_report_items_id_seq'::regclass);


--
-- Name: task_periodic_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_reports ALTER COLUMN id SET DEFAULT nextval('public.task_periodic_reports_id_seq'::regclass);


--
-- Name: task_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions ALTER COLUMN id SET DEFAULT nextval('public.task_submissions_id_seq'::regclass);


--
-- Name: task_updates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_updates ALTER COLUMN id SET DEFAULT nextval('public.task_updates_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: trang_thai_task id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trang_thai_task ALTER COLUMN id SET DEFAULT nextval('public.trang_thai_task_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_knowledge_base ai_knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_knowledge_base
    ADD CONSTRAINT ai_knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: ai_unanswered_questions ai_unanswered_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_unanswered_questions
    ADD CONSTRAINT ai_unanswered_questions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: conversation_members conversation_members_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_members conversation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: document_priorities document_priorities_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_priorities
    ADD CONSTRAINT document_priorities_code_key UNIQUE (code);


--
-- Name: document_priorities document_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_priorities
    ADD CONSTRAINT document_priorities_pkey PRIMARY KEY (id);


--
-- Name: document_security_levels document_security_levels_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_security_levels
    ADD CONSTRAINT document_security_levels_code_key UNIQUE (code);


--
-- Name: document_security_levels document_security_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_security_levels
    ADD CONSTRAINT document_security_levels_pkey PRIMARY KEY (id);


--
-- Name: document_source_levels document_source_levels_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_source_levels
    ADD CONSTRAINT document_source_levels_code_key UNIQUE (code);


--
-- Name: document_source_levels document_source_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_source_levels
    ADD CONSTRAINT document_source_levels_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_code_key UNIQUE (code);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employee_periodic_report_items employee_periodic_report_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_report_items
    ADD CONSTRAINT employee_periodic_report_items_pkey PRIMARY KEY (id);


--
-- Name: employee_periodic_report_items employee_periodic_report_items_report_id_subtask_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_report_items
    ADD CONSTRAINT employee_periodic_report_items_report_id_subtask_id_key UNIQUE (report_id, subtask_id);


--
-- Name: employee_periodic_reports employee_periodic_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_reports
    ADD CONSTRAINT employee_periodic_reports_pkey PRIMARY KEY (id);


--
-- Name: employee_periodic_reports employee_periodic_reports_reporter_id_period_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_reports
    ADD CONSTRAINT employee_periodic_reports_reporter_id_period_key_key UNIQUE (reporter_id, period_key);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: subtask_periodic_reports subtask_periodic_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtask_periodic_reports
    ADD CONSTRAINT subtask_periodic_reports_pkey PRIMARY KEY (id);


--
-- Name: subtasks subtasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_unique UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: task_approvals task_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_approvals
    ADD CONSTRAINT task_approvals_pkey PRIMARY KEY (id);


--
-- Name: task_documents task_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_pkey PRIMARY KEY (id);


--
-- Name: task_logs task_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_logs
    ADD CONSTRAINT task_logs_pkey PRIMARY KEY (id);


--
-- Name: task_periodic_report_items task_periodic_report_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_report_items
    ADD CONSTRAINT task_periodic_report_items_pkey PRIMARY KEY (id);


--
-- Name: task_periodic_reports task_periodic_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_reports
    ADD CONSTRAINT task_periodic_reports_pkey PRIMARY KEY (id);


--
-- Name: task_submissions task_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_pkey PRIMARY KEY (id);


--
-- Name: task_updates task_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: trang_thai_task trang_thai_task_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trang_thai_task
    ADD CONSTRAINT trang_thai_task_code_key UNIQUE (code);


--
-- Name: trang_thai_task trang_thai_task_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trang_thai_task
    ADD CONSTRAINT trang_thai_task_pkey PRIMARY KEY (id);


--
-- Name: role_permissions unique_role_permission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT unique_role_permission UNIQUE (role_id, permission);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_tasks_unit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_unit ON public.tasks USING btree (unit_id) WHERE (deleted_at IS NULL);


--
-- Name: unique_subtask_periodic_report_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_subtask_periodic_report_period ON public.subtask_periodic_reports USING btree (subtask_id, reporter_id, period_key) WHERE (period_key IS NOT NULL);


--
-- Name: unique_task_periodic_report_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_task_periodic_report_period ON public.task_periodic_reports USING btree (task_id, reporter_id, period_key) WHERE (period_key IS NOT NULL);


--
-- Name: tasks tr_audit_tasks; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_audit_tasks AFTER INSERT OR DELETE OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();


--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_knowledge_base ai_knowledge_base_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_knowledge_base
    ADD CONSTRAINT ai_knowledge_base_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ai_unanswered_questions ai_unanswered_questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_unanswered_questions
    ADD CONSTRAINT ai_unanswered_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversation_members conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversations conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: conversations conversations_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: documents documents_office_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_office_reviewer_id_fkey FOREIGN KEY (office_reviewer_id) REFERENCES public.users(id);


--
-- Name: documents documents_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: employee_periodic_report_items employee_periodic_report_items_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_report_items
    ADD CONSTRAINT employee_periodic_report_items_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.employee_periodic_reports(id) ON DELETE CASCADE;


--
-- Name: employee_periodic_report_items employee_periodic_report_items_subtask_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_report_items
    ADD CONSTRAINT employee_periodic_report_items_subtask_id_fkey FOREIGN KEY (subtask_id) REFERENCES public.subtasks(id);


--
-- Name: employee_periodic_report_items employee_periodic_report_items_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_report_items
    ADD CONSTRAINT employee_periodic_report_items_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: employee_periodic_reports employee_periodic_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_reports
    ADD CONSTRAINT employee_periodic_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: employee_periodic_reports employee_periodic_reports_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_periodic_reports
    ADD CONSTRAINT employee_periodic_reports_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: documents fk_documents_cap_ban_hanh; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_cap_ban_hanh FOREIGN KEY (cap_ban_hanh) REFERENCES public.document_source_levels(code);


--
-- Name: documents fk_documents_muc_do_bao_mat; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_muc_do_bao_mat FOREIGN KEY (muc_do_bao_mat) REFERENCES public.document_security_levels(code);


--
-- Name: documents fk_documents_muc_do_uu_tien; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_muc_do_uu_tien FOREIGN KEY (muc_do_uu_tien) REFERENCES public.document_priorities(code);


--
-- Name: notifications fk_notifications_document; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_document FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: tasks fk_trang_thai; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_trang_thai FOREIGN KEY (trang_thai_id) REFERENCES public.trang_thai_task(id);


--
-- Name: users fk_users_unit; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_unit FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: subtask_periodic_reports subtask_periodic_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtask_periodic_reports
    ADD CONSTRAINT subtask_periodic_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: subtask_periodic_reports subtask_periodic_reports_subtask_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtask_periodic_reports
    ADD CONSTRAINT subtask_periodic_reports_subtask_id_fkey FOREIGN KEY (subtask_id) REFERENCES public.subtasks(id);


--
-- Name: subtask_periodic_reports subtask_periodic_reports_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtask_periodic_reports
    ADD CONSTRAINT subtask_periodic_reports_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: subtasks subtasks_assignee_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES public.users(id);


--
-- Name: subtasks subtasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_approvals task_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_approvals
    ADD CONSTRAINT task_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: task_approvals task_approvals_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_approvals
    ADD CONSTRAINT task_approvals_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_documents task_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: task_documents task_documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_periodic_report_items task_periodic_report_items_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_report_items
    ADD CONSTRAINT task_periodic_report_items_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.task_periodic_reports(id) ON DELETE CASCADE;


--
-- Name: task_periodic_report_items task_periodic_report_items_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_report_items
    ADD CONSTRAINT task_periodic_report_items_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_periodic_reports task_periodic_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_reports
    ADD CONSTRAINT task_periodic_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: task_periodic_reports task_periodic_reports_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_reports
    ADD CONSTRAINT task_periodic_reports_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_periodic_reports task_periodic_reports_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_periodic_reports
    ADD CONSTRAINT task_periodic_reports_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: task_submissions task_submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: task_submissions task_submissions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_assignee_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_lanh_dao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_lanh_dao_id_fkey FOREIGN KEY (lanh_dao_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict lgNgM0NgAqAZlO5Ld2kXnZYvaEK3HVfDjNxzJURVkZlamoq5iOWgyxWn8aqtzcH

