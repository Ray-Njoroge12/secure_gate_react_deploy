import 'package:flutter/material.dart';

void main() {
  runApp(const ResidentApp());
}

class ResidentApp extends StatelessWidget {
  const ResidentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Secure Gate Resident',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const ResidentLoginScreen(),
        '/home': (context) => const ResidentHomeScreen(),
      },
    );
  }
}

class ResidentLoginScreen extends StatelessWidget {
  const ResidentLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              Text(
                'Resident Login',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Manage your invites and visitor history.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              const TextField(
                decoration: InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              const TextField(
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacementNamed('/home');
                  },
                  child: const Text('Sign In'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ResidentHomeScreen extends StatefulWidget {
  const ResidentHomeScreen({super.key});

  @override
  State<ResidentHomeScreen> createState() => _ResidentHomeScreenState();
}

class _ResidentHomeScreenState extends State<ResidentHomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    InviteCreationPage(),
    ApprovalQueuePage(),
    VisitHistoryPage(),
    NotificationCenterPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Resident Portal')),
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.add_circle_outline), label: 'Invite'),
          BottomNavigationBarItem(icon: Icon(Icons.how_to_reg), label: 'Approve'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications), label: 'Alerts'),
        ],
      ),
    );
  }
}

class InviteCreationPage extends StatelessWidget {
  const InviteCreationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Create Invite', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          const Text('Invite guests to your residence.'),
          const SizedBox(height: 16),
          const TextField(
            decoration: InputDecoration(
              labelText: 'Visitor name',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          const TextField(
            decoration: InputDecoration(
              labelText: 'Visit date & time',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              child: const Text('Create Invite'),
            ),
          ),
        ],
      ),
    );
  }
}

class ApprovalQueuePage extends StatelessWidget {
  const ApprovalQueuePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Approve/Deny', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          const Text('Review pending guest approvals.'),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              title: const Text('Alex Johnson'),
              subtitle: const Text('Delivery • Today 2:00 PM'),
              trailing: Wrap(
                spacing: 8,
                children: [
                  TextButton(onPressed: () {}, child: const Text('Deny')),
                  ElevatedButton(onPressed: () {}, child: const Text('Approve')),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class VisitHistoryPage extends StatelessWidget {
  const VisitHistoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Visit History', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          const Text('Recent check-ins and check-outs.'),
          const SizedBox(height: 16),
          const ListTile(
            leading: Icon(Icons.check_circle_outline),
            title: Text('Sam Lee'),
            subtitle: Text('Checked in at 9:12 AM'),
          ),
          const ListTile(
            leading: Icon(Icons.exit_to_app),
            title: Text('Delivery - Parcel'),
            subtitle: Text('Checked out at 10:45 AM'),
          ),
        ],
      ),
    );
  }
}

class NotificationCenterPage extends StatelessWidget {
  const NotificationCenterPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Notifications', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          const Text('Updates about your invites.'),
          const SizedBox(height: 16),
          const Card(
            child: ListTile(
              leading: Icon(Icons.notifications_active),
              title: Text('Guest arrived'),
              subtitle: Text('Your guest checked in at the gate.'),
            ),
          ),
        ],
      ),
    );
  }
}
