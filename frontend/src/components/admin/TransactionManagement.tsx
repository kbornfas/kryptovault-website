import {
  Badge,
  Box,
  Button,
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
import axios from 'axios';
import { useQuery } from 'react-query';

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

  const { data: transactions, isLoading } = useQuery<Transaction[]>('transactions', () =>
    axios.get('/api/admin/transactions').then((res) => res.data)
  );

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

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
            </Tr>
          </Thead>
          <Tbody>
            {transactions?.map((transaction) => (
              <Tr key={transaction.id}>
                <Td>{transaction.user.email}</Td>
                <Td>
                  <Badge
                    colorScheme={transaction.type === 'DEPOSIT' ? 'green' : 'orange'}
                  >
                    {transaction.type}
                  </Badge>
                </Td>
                <Td>{transaction.amount}</Td>
                <Td>{transaction.currency}</Td>
                <Td>
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
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TransactionManagement;