"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    AlertCircle,
    CheckCircle,
    ExternalLink,
    Plus,
    Trash2,
    User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface LinkedInAccount {
    id: string;
    linkedinUserId: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    isActive: boolean;
    lastTokenRefresh?: string;
    accessTokenExpiresAt?: string;
    createdAt: string;
}

export function LinkedInAccountManager() {
    const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/linkedin/accounts');
            if (response.ok) {
                const data = await response.json();
                setAccounts(data.accounts);
            } else {
                toast.error('Failed to fetch LinkedIn accounts');
            }
        } catch (error) {
            console.error('Error fetching LinkedIn accounts:', error);
            toast.error('Error fetching LinkedIn accounts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectLinkedIn = async () => {
        setIsConnecting(true);
        try {
            // Open LinkedIn OAuth in a popup window
            const width = 600;
            const height = 700;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            const popup = window.open(
                '/api/linkedin/oauth',
                'linkedin-oauth',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
            );

            if (!popup) {
                throw new Error('Failed to open OAuth window. Please allow popups for this site.');
            }

            // Listen for OAuth completion
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    setIsConnecting(false);
                    // Refresh accounts after OAuth completes
                    setTimeout(fetchAccounts, 1000);
                }
            }, 1000);

            // Also listen for messages from the popup
            const messageHandler = (event: MessageEvent) => {
                if (event.origin === window.location.origin) {
                    if (event.data === 'linkedin-oauth-success' || event.data === 'linkedin-oauth-error') {
                        popup.close();
                        clearInterval(checkClosed);
                        setIsConnecting(false);
                        if (event.data === 'linkedin-oauth-success') {
                            toast.success('LinkedIn account connected successfully!');
                            setTimeout(fetchAccounts, 1000);
                        } else {
                            toast.error('Failed to connect LinkedIn account');
                        }
                    }
                }
            };

            window.addEventListener('message', messageHandler);
            return () => window.removeEventListener('message', messageHandler);

        } catch (error) {
            console.error('Error connecting LinkedIn account:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to connect LinkedIn account');
            setIsConnecting(false);
        }
    };

    const handleDisconnectAccount = async (accountId: string) => {
        setIsDisconnecting(accountId);
        try {
            const response = await fetch(`/api/linkedin/accounts?accountId=${accountId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('LinkedIn account disconnected successfully');
                setAccounts(accounts.filter(account => account.id !== accountId));
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to disconnect LinkedIn account');
            }
        } catch (error) {
            console.error('Error disconnecting LinkedIn account:', error);
            toast.error('Error disconnecting LinkedIn account');
        } finally {
            setIsDisconnecting(null);
        }
    };

    const isTokenExpired = (expiresAt?: string) => {
        if (!expiresAt) return true;
        return new Date(expiresAt) < new Date();
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>LinkedIn Accounts</CardTitle>
                    <CardDescription>Manage your LinkedIn connections</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>LinkedIn Accounts</CardTitle>
                    <CardDescription>Connect and manage your LinkedIn profiles</CardDescription>
                </div>
                <Button
                    onClick={handleConnectLinkedIn}
                    disabled={isConnecting}
                    className="flex items-center gap-2"
                >
                    {isConnecting ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Connecting...
                        </>
                    ) : (
                        <>
                            <Plus className="h-4 w-4" />
                            Connect Account
                        </>
                    )}
                </Button>
            </CardHeader>
            <CardContent>
                {accounts.length === 0 ? (
                    <div className="text-center py-8">
                        <UserIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No LinkedIn accounts connected</h3>
                        <p className="text-muted-foreground mb-4">
                            Connect your LinkedIn account to start scheduling posts
                        </p>
                        <Button onClick={handleConnectLinkedIn} disabled={isConnecting}>
                            {isConnecting ? 'Connecting...' : 'Connect LinkedIn Account'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {accounts.map((account) => (
                            <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Avatar>
                                        <AvatarImage src={account.profileImageUrl} alt={account.firstName} />
                                        <AvatarFallback>
                                            {account.firstName.charAt(0)}{account.lastName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">
                                                {account.firstName} {account.lastName}
                                            </h4>
                                            <Badge variant={account.isActive ? "default" : "secondary"}>
                                                {account.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                            {isTokenExpired(account.accessTokenExpiresAt) && (
                                                <Badge variant="destructive">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    Token Expired
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{account.email}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Connected {formatDistanceToNow(new Date(account.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`https://linkedin.com/in/${account.linkedinUserId}`, '_blank')}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Disconnect LinkedIn Account</DialogTitle>
                                                <DialogDescription>
                                                    Are you sure you want to disconnect {account.firstName} {account.lastName}?
                                                    This will remove the account and any scheduled posts associated with it will not be published.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="flex justify-end space-x-2 pt-4">
                                                <Button variant="outline">
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleDisconnectAccount(account.id)}
                                                    disabled={isDisconnecting === account.id}
                                                >
                                                    {isDisconnecting === account.id ? 'Disconnecting...' : 'Disconnect Account'}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}