-- Example data so the org chart is not empty on first run. Replace with real staff.
insert into public.departments (name, description, color) values
  ('Executive', 'Company leadership', '#7c3aed'),
  ('Operations', 'Day-to-day service delivery', '#2563eb'),
  ('Sales', 'Client acquisition and accounts', '#059669'),
  ('Finance', 'Accounting, payroll and budgets', '#d97706'),
  ('Human Resources', 'People, hiring and policies', '#db2777');

with d as (select id, name from public.departments),
ceo as (
  insert into public.people (full_name, title, department_id)
  select 'Example CEO', 'Chief Executive Officer', id from d where name = 'Executive'
  returning id
)
insert into public.people (full_name, title, department_id, manager_id)
select v.full_name, v.title, d.id, (select id from ceo)
from (values
  ('Example Ops Manager', 'Operations Manager', 'Operations'),
  ('Example Sales Manager', 'Sales Manager', 'Sales'),
  ('Example Finance Manager', 'Finance Manager', 'Finance'),
  ('Example HR Manager', 'HR Manager', 'Human Resources')
) as v(full_name, title, dept)
join d on d.name = v.dept;
