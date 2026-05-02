export const getPagination = (page = 1, limit = 200) => {
  const p = Number(page) || 1;
  const l = Number(limit) || 200;

  return {
    page: p,
    limit: l,
    offset: (p - 1) * l,
  };
};

export const getPagingData = (rows, total, page, limit) => ({
  data: rows,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  },
});