-- General departments, plus placeholder managers so the org chart is not empty. Replace with real staff.
insert into public.departments (name, description, color) values
  ('Management', 'Owners, Managing Director and MD office', '#1B2A3A'),
  ('Sales', 'Sales, tenders and key accounts', '#1F7A8C'),
  ('Marketing', 'Marketing, products and applications', '#3F5FA8'),
  ('Service', 'Installation and maintenance', '#247A4A'),
  ('Purchasing', 'Purchasing, import and warehouses', '#9A5F10'),
  ('Finance', 'Accounting, collections and systems', '#6E4FA3'),
  ('Legal & HR', 'Legal, HR and admin', '#A24A78'),
  ('Systems & Quality', 'Systems (IT / Odoo) and quality', '#B23A3A');

with d as (select id, name from public.departments),
md as (
  insert into public.people (full_name, title, department_id)
  select 'Example MD', 'Managing Director', id from d where name = 'Management'
  returning id
)
insert into public.people (full_name, title, department_id, manager_id)
select v.full_name, v.title, d.id, (select id from md)
from (values
  ('Example Sales Manager', 'Sales Manager', 'Sales'),
  ('Example Service Manager', 'Service Manager', 'Service'),
  ('Example Finance Manager', 'Finance Manager', 'Finance'),
  ('Example HR Manager', 'Legal & HR Manager', 'Legal & HR')
) as v(full_name, title, dept)
join d on d.name = v.dept;
