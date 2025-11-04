# API Key Provisioning

This backend authenticates every client request with an API key. Each key is
mapped to a specific user (`api_key.tenant_id`), so mobile devices can call the
`/me` endpoints without hardcoding a UUID.

Follow these steps in a local environment:

1. **Create (or find) a user record**

   ```sql
   -- list existing users
   select id, email from users order by created_at desc;

   -- or insert a test user if needed
   insert into users (id, email, time_bucket, level, diet_tilt)
   values ('11111111-2222-3333-4444-555555555555', 'dev@fitness.app', 2, 'INTERMEDIATE', 'BALANCED');
   ```

2. **Mint an administrative API key** (only once). Bootstrap by inserting a
   key directly, or reuse an existing one:

   ```sql
   insert into api_key (key_value, name, tenant_id, enabled)
   values ('admin-local-key', 'Local Admin', '11111111-2222-3333-4444-555555555555', true);
   ```

3. **Generate a user-scoped key** using the helper script. The script requires
   `jq` and the admin key from the previous step:

   ```bash
   export ADMIN_API_KEY=admin-local-key
   chmod +x ./bin/create-api-key.sh
   ./bin/create-api-key.sh "iOS Simulator" 11111111-2222-3333-4444-555555555555
   ```

   The JSON response contains the `key` value—copy it into:

   - `fitness-mvp/.env` → `API_KEY=<returned-value>`
   - Any other client or test harness that needs to act as this user

4. **Verify** by calling the self-profile endpoint:

   ```bash
   curl -H "X-API-Key: <user-key>" http://localhost:8080/api/v1/me
   ```

## Operational Notes

- Rotate keys by calling `DELETE /api/admin/api-keys/{id}` with the admin key.
- For production, seed admin keys through Flyway or your secret manager rather
  than direct SQL.
- When running multiple backend instances, configure Redis caching (see
  `application.yml`) so the planned nutrition insight cache can be shared across
  nodes.
