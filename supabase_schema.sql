-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tenants Table
create table tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  timezone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Users Table
create table users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password text not null, -- Hashed
  name text,
  role text default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  tenant_id uuid references tenants(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clients Table
create table clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  email text,
  notes text,
  tenant_id uuid references tenants(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookings Table
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  tenant_id uuid references tenants(id) on delete cascade not null,
  date timestamp with time zone not null,
  status text default 'Scheduled',
  purpose text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Meeting Minutes Table
create table meeting_minutes (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  tenant_id uuid references tenants(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table (Chat History)
create table messages (
  id uuid default uuid_generate_v4() primary key,
  session_id text not null,
  role text not null, -- user, assistant, system
  content text not null,
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscriptions Table
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) on delete cascade unique not null,
  plan text not null, -- Basic, Intermediate, Advanced
  status text not null, -- Active, Inactive, Cancelled
  stripe_id text,
  paypal_id text,
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Examples)
alter table tenants enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table meeting_minutes enable row level security;
alter table messages enable row level security;
alter table subscriptions enable row level security;

-- Policy: Users can see their own tenant data
-- Note: This requires setting app.current_tenant_id in the session or similar mechanism
