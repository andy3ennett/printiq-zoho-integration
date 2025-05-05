export function requireTokenAuth(req, res, next) {
  const expectedToken = process.env.HEALTH_TOKEN;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'FAIL',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  if (token !== expectedToken) {
    return res.status(403).json({ status: 'FAIL', message: 'Invalid token' });
  }

  next();
}