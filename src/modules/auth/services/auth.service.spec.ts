import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../security/entities/user.entity';
import { Session } from '../../security/entities/session.entity';
import { JwtTokenService } from './jwt-token.service';
import { SessionService } from './session.service';
import { AuditService } from '../../audit/services/audit.service';
import { EmailService } from '../../notification/services/email.service';

describe('AuthService - Password Reset Flow', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtTokenService: any;
  let sessionService: any;
  let emailService: any;
  let auditService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    jwtTokenService = {
      generatePasswordResetToken: jest.fn(),
      verifyPasswordResetToken: jest.fn(),
    };
    sessionService = {
      closeAllSessions: jest.fn(),
    };
    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordChangedConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    };
    auditService = {
      logAuthEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: {},
        },
        {
          provide: JwtTokenService,
          useValue: jwtTokenService,
        },
        {
          provide: SessionService,
          useValue: sessionService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('forgotPassword', () => {
    it('should return generic success message when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Si el correo está registrado');
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return generic success message and send email when user exists and is active', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'juan.perez',
        status: 'active',
        person: {
          email: 'juan@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
        },
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      jwtTokenService.generatePasswordResetToken.mockResolvedValue('mock-reset-token');

      const result = await service.forgotPassword('juan@example.com');

      expect(result.success).toBe(true);
      expect(jwtTokenService.generatePasswordResetToken).toHaveBeenCalledWith(
        'user-123',
        'juan@example.com',
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'juan@example.com',
        'mock-reset-token',
        'Juan Pérez',
      );
    });
  });

  describe('resetPassword', () => {
    it('should throw UnauthorizedException if token verification fails', async () => {
      jwtTokenService.verifyPasswordResetToken.mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.resetPassword('bad-token', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token type is not PASSWORD_RESET', async () => {
      jwtTokenService.verifyPasswordResetToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        type: 'ACCESS_TOKEN',
      });

      await expect(
        service.resetPassword('wrong-type-token', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user is not found', async () => {
      jwtTokenService.verifyPasswordResetToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        type: 'PASSWORD_RESET',
      });
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('valid-token', 'NewPassword123!'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update password, close sessions, and send confirmation email', async () => {
      jwtTokenService.verifyPasswordResetToken.mockResolvedValue({
        userId: 'user-123',
        email: 'juan@example.com',
        type: 'PASSWORD_RESET',
      });
      const mockUser = {
        id: 'user-123',
        username: 'juan.perez',
        status: 'active',
        passwordHash: 'old-hash',
        person: {
          email: 'juan@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
        },
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.resetPassword('valid-token', 'NewSecurePassword123');

      expect(result.success).toBe(true);
      expect(userRepository.save).toHaveBeenCalled();
      expect(mockUser.passwordHash).not.toBe('old-hash');
      expect(sessionService.closeAllSessions).toHaveBeenCalledWith('user-123');
      expect(emailService.sendPasswordChangedConfirmationEmail).toHaveBeenCalledWith(
        'juan@example.com',
        'Juan Pérez',
      );
    });
  });
});
