import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('dashboard')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // User Management
  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Put('users/:id/kyc')
  async updateUserKycStatus(
    @Param('id') userId: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'PENDING',
  ) {
    return this.adminService.updateUserStatus(userId, status);
  }

  // Investment Management
  @Get('investments')
  async getAllInvestments() {
    return this.adminService.getAllInvestments();
  }

  @Get('investments/:id')
  async getInvestmentDetails(@Param('id') investmentId: string) {
    return this.adminService.getInvestmentDetails(investmentId);
  }

  @Put('investments/:id/status')
  async updateInvestmentStatus(
    @Param('id') investmentId: string,
    @Body('status') status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  ) {
    return this.adminService.updateInvestmentStatus(investmentId, status);
  }

  // Transaction Management
  @Get('transactions')
  async getAllTransactions() {
    return this.adminService.getAllTransactions();
  }

  @Put('transactions/:id/status')
  async updateTransactionStatus(
    @Param('id') transactionId: string,
    @Body('status') status: 'PENDING' | 'COMPLETED' | 'FAILED',
  ) {
    return this.adminService.updateTransactionStatus(transactionId, status);
  }

  // Plan Management
  @Get('plans')
  async getAllPlans() {
    return this.adminService.getAllPlans();
  }

  @Put('plans/:id')
  async updatePlan(
    @Param('id') planId: string,
    @Body() data: {
      name?: string;
      description?: string;
      minAmount?: number;
      maxAmount?: number;
      returnRate?: number;
      duration?: number;
      active?: boolean;
    },
  ) {
    return this.adminService.updatePlan(planId, data);
  }
}