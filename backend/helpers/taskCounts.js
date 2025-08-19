// helpers/taskCounts.js
async function getCountsForUser(pool, userId) {
  const [rows] = await pool.query(
    `
    SELECT status, COUNT(*) AS cnt
    FROM tasks
    WHERE assigned_to = ?
    GROUP BY status
  `,
    [userId]
  );

  const m = Object.fromEntries(rows.map((r) => [r.status, Number(r.cnt)]));
  return {
    pendingTasks: m["Pending"] || 0,
    inProgressTasks: m["In Progress"] || 0,
    completedTasks: m["Completed"] || 0,
  };
}
module.exports = { getCountsForUser };
