import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import Parse from 'parse/node';

interface JWTPayload {
  userId: string;
  [key: string]: any;
}

export const generateJWT = (userId: string): string => {
  const payload: JWTPayload = { userId };
  const secret = process.env.JWT_SECRET as Secret;
  
  if (!secret) {
    throw new Error('JWT_SECRET 环境变量未设置');
  }

  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  } as SignOptions;

  return jwt.sign(payload, secret, options);
};

export const verifyJWT = async (token: string): Promise<Parse.User | null> => {
  try {
    const secret = process.env.JWT_SECRET as Secret;
    if (!secret) {
      throw new Error('JWT_SECRET 环境变量未设置');
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;
    const query = new Parse.Query(Parse.User);
    return await query.get(decoded.userId, { useMasterKey: true });
  } catch (error) {
    return null;
  }
};