import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import {
  Badge,
  Box,
  Button,
  HStack,
  Select,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';

interface Transaction {
  id: string;
  userId: string;
  user: {
    email: string;
  };
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  currency: string;
  createdAt: string;
  txHash?: string;
}

const TransactionManagement = () => {
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const queryClient = useQueryClient();

  const {
    data: transactions = [],
    isLoading,
    isError,
  } = useQuery<Transaction[]>(
    ['admin-transactions'],
    async () => {
      const response = await apiClient.get<Transaction[]>(`${API_ENDPOINTS.ADMIN}/transactions`);
      return response.data;
    },
    {
      staleTime: 20_000,
    },
  );

  const resolveErrorMessage = (error: unknown) => {
    if (isAxiosError<{ message?: string }>(error)) {
      const message = error.response?.data?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    return 'Please try again later.';
  };

  const updateTransactionStatus = useMutation(
    ({ transactionId, status }: { transactionId: string; status: Transaction['status'] }) =>
      apiClient.put(`${API_ENDPOINTS.ADMIN}/transactions/${transactionId}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-transactions']);
        toast({
          title: 'Transaction updated',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error: unknown) => {
        toast({
          title: 'Unable to update transaction',
          description: resolveErrorMessage(error),
          status: 'error',
        });
      },
    },
  );

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  if (isError) {
    return <Box color="red.400">Unable to load transactions right now.</Box>;
  }

  const formatAmount = (value: number, currencyCode?: string) => {
    const normalizedCode = currencyCode && currencyCode.length === 3 ? currencyCode : 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCode,
    }).format(value ?? 0);
  };

  return (
    <Box bg={bgColor} p={6} borderRadius="lg">
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Type</Th>
              <Th>Amount</Th>
              <Th>Currency</Th>
              <Th>Status</Th>
              <Th>Transaction Hash</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {transactions.map((transaction) => (
              <Tr key={transaction.id}>
                <Td>{transaction.user.email}</Td>
                <Td>
                  <Badge
                    colorScheme={transaction.type === 'DEPOSIT' ? 'green' : 'orange'}
                  >
                    {transaction.type}
                  </Badge>
                </Td>
                <Td>{formatAmount(transaction.amount, transaction.currency)}</Td>
                <Td>{transaction.currency}</Td>
                <Td>
                  <HStack spacing={2}>
                    <Badge
                      colorScheme={
                        transaction.status === 'COMPLETED'
                          ? 'green'
                          : transaction.status === 'PENDING'
                            ? 'yellow'
                            : 'red'
                      }
                    >
                      {transaction.status}
                    </Badge>
                    <Select
                      size="sm"
                      width="150px"
                      value={transaction.status}
                      isDisabled={updateTransactionStatus.isLoading}
                      onChange={(event) =>
                        updateTransactionStatus.mutate({
                          transactionId: transaction.id,
                          status: event.target.value as Transaction['status'],
                        })
                      }
                    >
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="FAILED">Failed</option>
                    </Select>
                  </HStack>
                </Td>
                <Td>
                  {transaction.txHash ? (
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() =>
                        window.open(
                          `https://etherscan.io/tx/${transaction.txHash}`,
                          '_blank'
                        )
                      }
                    >
                      View Transaction
                    </Button>
                  ) : (
                    'N/A'
                  )}
                </Td>
                <Td>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme="green"
                      variant="solid"
                      isDisabled={transaction.status === 'COMPLETED'}
                      isLoading={updateTransactionStatus.isLoading}
                      onClick={() =>
                        updateTransactionStatus.mutate({
                          transactionId: transaction.id,
                          status: 'COMPLETED',
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      isDisabled={transaction.status === 'FAILED'}
                      isLoading={updateTransactionStatus.isLoading}
                      onClick={() =>
                        updateTransactionStatus.mutate({
                          transactionId: transaction.id,
                          status: 'FAILED',
                        })
                      }
                    >
                      Reject
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
            {transactions.length === 0 && (
              <Tr>
                <Td colSpan={8} textAlign="center" py={6}>
                  No transactions found.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TransactionManagement;