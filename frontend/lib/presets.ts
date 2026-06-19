import type { PresetProgram } from '@/types/jvm';

export const PRESET_PROGRAMS: PresetProgram[] = [
  {
    id: 'factorial',
    title: 'Recursive Factorial',
    description: 'Watch how recursive calls build up a stack — then unwind as each call returns.',
    category: 'Recursion',
    mainClass: 'Main',
    code: `public class Main {
    public static void main(String[] args) {
        int result = factorial(5);
        System.out.println("5! = " + result);
    }

    static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
}`,
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Recursion',
    description: 'See how fibonacci creates exponential stack depth with repeated sub-calls.',
    category: 'Recursion',
    mainClass: 'Main',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println(fib(6));
    }

    static int fib(int n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
    }
}`,
  },
  {
    id: 'object-references',
    title: 'Object & References',
    description: 'Explore how object references work in Java — who points where?',
    category: 'OOP',
    mainClass: 'Main',
    code: `public class Main {
    static class User {
        String name;
        int age;
        User(String name, int age) {
            this.name = name;
            this.age = age;
        }
    }

    public static void main(String[] args) {
        User alice = new User("Alice", 30);
        User bob = new User("Bob", 25);
        User ref = alice;      // ref points to same object as alice
        alice = null;          // alice no longer points to User
        System.out.println(ref.name); // ref still holds the object
    }
}`,
  },
  {
    id: 'inheritance',
    title: 'Inheritance & Polymorphism',
    description: 'See how objects of different classes share a reference type on the heap.',
    category: 'OOP',
    mainClass: 'Main',
    code: `public class Main {
    static abstract class Shape {
        abstract double area();
    }
    static class Circle extends Shape {
        double radius;
        Circle(double r) { this.radius = r; }
        double area() { return Math.PI * radius * radius; }
    }
    static class Rectangle extends Shape {
        double w, h;
        Rectangle(double w, double h) { this.w = w; this.h = h; }
        double area() { return w * h; }
    }

    public static void main(String[] args) {
        Shape[] shapes = { new Circle(5), new Rectangle(4, 6) };
        for (Shape s : shapes) {
            System.out.println(s.area());
        }
    }
}`,
  },
  {
    id: 'string-pool',
    title: 'String Pool',
    description: 'Discover why string literals share the same heap object but new String() does not.',
    category: 'Strings',
    mainClass: 'Main',
    code: `public class Main {
    public static void main(String[] args) {
        String s1 = "hello";
        String s2 = "hello";      // Same pool object as s1
        String s3 = new String("hello"); // NEW heap object

        System.out.println(s1 == s2);    // true — same reference
        System.out.println(s1 == s3);    // false — different object
        System.out.println(s1.equals(s3)); // true — same value

        String s4 = s3.intern();  // s4 now points to pool object
        System.out.println(s1 == s4); // true
    }
}`,
  },
  {
    id: 'arraylist',
    title: 'ArrayList Internals',
    description: 'Watch how an ArrayList grows its internal array as elements are added.',
    category: 'Collections',
    mainClass: 'Main',
    code: `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<String> list = new ArrayList<>();
        list.add("Alpha");
        list.add("Beta");
        list.add("Gamma");
        list.add("Delta");

        System.out.println("Size: " + list.size());
        list.remove(1);
        System.out.println("After remove: " + list);
    }
}`,
  },
  {
    id: 'linked-list',
    title: 'Linked List',
    description: 'See how a linked list weaves objects together through references on the heap.',
    category: 'Collections',
    mainClass: 'Main',
    code: `public class Main {
    static class Node {
        int val;
        Node next;
        Node(int val) { this.val = val; }
    }

    public static void main(String[] args) {
        Node head = new Node(1);
        head.next = new Node(2);
        head.next.next = new Node(3);

        // Traverse
        Node curr = head;
        while (curr != null) {
            System.out.println(curr.val);
            curr = curr.next;
        }
    }
}`,
  },
  {
    id: 'gc-demo',
    title: 'Garbage Collection',
    description: 'Create unreachable objects and watch GC mark them for collection.',
    category: 'GC',
    mainClass: 'Main',
    code: `public class Main {
    static class Temp {
        byte[] data;
        Temp(int size) { this.data = new byte[size]; }
    }

    public static void main(String[] args) {
        for (int i = 0; i < 5; i++) {
            Temp t = new Temp(1024 * 100); // 100KB per iteration
            System.out.println("Created: " + i);
            // t goes out of scope — becomes unreachable after each iteration
        }
        System.gc(); // Suggest GC
        System.out.println("GC suggested");
    }
}`,
  },
  {
    id: 'stack-overflow',
    title: 'Stack Overflow',
    description: 'See exactly how infinite recursion consumes stack frames until the JVM gives up.',
    category: 'Recursion',
    mainClass: 'Main',
    code: `public class Main {
    public static void main(String[] args) {
        try {
            infinite(0);
        } catch (StackOverflowError e) {
            System.out.println("Stack overflow caught after deep recursion!");
        }
    }

    static void infinite(int depth) {
        System.out.println("Depth: " + depth);
        infinite(depth + 1);
    }
}`,
  },
  {
    id: 'java-records',
    title: 'Java Records (Java 16+)',
    description: 'Explore how Java Records create compact, immutable data classes on the heap.',
    category: 'OOP',
    mainClass: 'Main',
    code: `public class Main {
    record Point(int x, int y) {
        // Compact constructor
        Point {
            if (x < 0 || y < 0) throw new IllegalArgumentException("Coordinates must be non-negative");
        }
        double distance() {
            return Math.sqrt(x * x + y * y);
        }
    }

    public static void main(String[] args) {
        Point p1 = new Point(3, 4);
        Point p2 = new Point(0, 0);
        System.out.println("Distance from origin: " + p1.distance());
        System.out.println("Points equal: " + p1.equals(p2));
    }
}`,
  },
];
