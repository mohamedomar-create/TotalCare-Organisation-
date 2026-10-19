-- TotalCare Egypt departments, plus placeholder heads so the org chart is not empty. Replace with real staff.
insert into public.departments (name, description, color) values
  ('Management', 'GM and GM office', '#1B2A3A'),
  ('Commercial', 'Tenders, hospitals, homecare and sales', '#1F7A8C'),
  ('Portfolio & Clinical', 'Product management, clinical education and marketing', '#3F5FA8'),
  ('Service', 'Installation, maintenance and repairs', '#247A4A'),
  ('Supply Chain & Regulatory', 'Import, customs, warehouses and EDA registration', '#9A5F10'),
  ('Finance & Odoo', 'Accounting, collections, Odoo and data', '#6E4FA3'),
  ('People & Admin', 'HR, admin, fleet and legal', '#A24A78'),
  ('Quality & Audit', 'Quality system (ISO 13485) and internal audit', '#B23A3A');

with d as (select id, name from public.departments),
gm as (
  insert into public.people (full_name, title, department_id)
  select 'Example GM', 'General Manager', id from d where name = 'Management'
  returning id
)
insert into public.people (full_name, title, department_id, manager_id)
select v.full_name, v.title, d.id, (select id from gm)
from (values
  ('Example Commercial Director', 'Commercial Director', 'Commercial'),
  ('Example Service Head', 'Service Head', 'Service'),
  ('Example Finance Head', 'Finance Head', 'Finance & Odoo'),
  ('Example People Head', 'People & Admin Head', 'People & Admin')
) as v(full_name, title, dept)
join d on d.name = v.dept;
