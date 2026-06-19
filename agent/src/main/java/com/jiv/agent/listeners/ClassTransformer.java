package com.jiv.agent.listeners;

import com.jiv.agent.emitter.EventEmitter;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.tree.*;

import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;
import java.util.*;

public class ClassTransformer implements ClassFileTransformer {

    private final EventEmitter emitter;
    private final Instrumentation inst;

    private static final Set<String> EXCLUDED_PREFIXES = Set.of(
        "java/", "javax/", "jdk/", "sun/", "com/sun/",
        "org/objectweb/asm/", "com/google/gson/",
        "com/jiv/agent/"
    );

    public ClassTransformer(EventEmitter emitter, Instrumentation inst) {
        this.emitter = emitter;
        this.inst = inst;
        JivRuntime.init(emitter, inst);
    }

    @Override
    public byte[] transform(ClassLoader loader, String className,
                            Class<?> classBeingRedefined,
                            ProtectionDomain protectionDomain,
                            byte[] classfileBuffer) {

        if (className == null || shouldExclude(className)) {
            return null; 
        }

        try {
            ClassReader cr = new ClassReader(classfileBuffer);
            ClassNode cn = new ClassNode();
            cr.accept(cn, ClassReader.EXPAND_FRAMES);

            String dottedClassName = className.replace('/', '.');

            boolean isBean = false;
            List<AnnotationNode> classAnns = new ArrayList<>();
            if (cn.visibleAnnotations != null) classAnns.addAll(cn.visibleAnnotations);
            if (cn.invisibleAnnotations != null) classAnns.addAll(cn.invisibleAnnotations);
            for (AnnotationNode ann : classAnns) {
                String desc = ann.desc;
                if (desc != null && desc.startsWith("L") && desc.endsWith(";")) {
                    String simpleName = getSimpleNameFromDesc(desc);
                    if (simpleName.equals("Component") || simpleName.equals("Service") || 
                        simpleName.equals("Repository") || simpleName.equals("Controller") || 
                        simpleName.equals("Bean") || simpleName.equals("Configuration")) {
                        isBean = true;
                        break;
                    }
                }
            }

            if (isBean) {
                List<String> deps = new ArrayList<>();
                if (cn.fields != null) {
                    for (FieldNode fn : cn.fields) {
                        List<AnnotationNode> fieldAnns = new ArrayList<>();
                        if (fn.visibleAnnotations != null) fieldAnns.addAll(fn.visibleAnnotations);
                        if (fn.invisibleAnnotations != null) fieldAnns.addAll(fn.invisibleAnnotations);
                        for (AnnotationNode ann : fieldAnns) {
                            String desc = ann.desc;
                            if (desc != null && desc.startsWith("L") && desc.endsWith(";")) {
                                String simpleName = getSimpleNameFromDesc(desc);
                                if (simpleName.equals("Autowired") || simpleName.equals("Inject") || 
                                    simpleName.equals("Resource")) {
                                    String fieldTypeDesc = fn.desc;
                                    if (fieldTypeDesc != null && fieldTypeDesc.startsWith("L") && fieldTypeDesc.endsWith(";")) {
                                        String typeSimpleName = getSimpleNameFromDesc(fieldTypeDesc);
                                        String depBeanName = Character.toLowerCase(typeSimpleName.charAt(0)) + typeSimpleName.substring(1);
                                        deps.add(depBeanName);
                                    }
                                }
                            }
                        }
                    }
                }
                JivRuntime.registerSpringBean(dottedClassName, deps);
            }

            for (MethodNode mn : cn.methods) {

                if ((mn.access & (Opcodes.ACC_ABSTRACT | Opcodes.ACC_NATIVE | Opcodes.ACC_SYNTHETIC | Opcodes.ACC_BRIDGE)) != 0) {
                    continue;
                }

                if (mn.name.equals("<clinit>")) {
                    continue;
                }
                transformMethod(dottedClassName, mn);
            }

            ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_MAXS | ClassWriter.COMPUTE_FRAMES);
            cn.accept(cw);
            return cw.toByteArray();
        } catch (Exception e) {
            System.err.println("[JIV Agent] Failed to transform class " + className + ": " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private boolean shouldExclude(String className) {
        for (String prefix : EXCLUDED_PREFIXES) {
            if (className.startsWith(prefix)) return true;
        }
        return false;
    }

    private void transformMethod(String className, MethodNode mn) {
        AbstractInsnNode[] insns = mn.instructions.toArray();
        int currentLine = 0;

        for (AbstractInsnNode insn : insns) {
            if (insn instanceof LineNumberNode lnn) {
                currentLine = lnn.line;
                break;
            }
        }

        AbstractInsnNode insertEnterPoint = mn.instructions.getFirst();
        if (mn.name.equals("<init>")) {
            for (AbstractInsnNode insn : insns) {
                if (insn.getOpcode() == Opcodes.INVOKESPECIAL) {
                    MethodInsnNode min = (MethodInsnNode) insn;
                    if (min.name.equals("<init>")) {
                        insertEnterPoint = insn.getNext();
                        break;
                    }
                }
            }
        }

        if (insertEnterPoint != null) {
            org.objectweb.asm.Type[] argTypes = org.objectweb.asm.Type.getArgumentTypes(mn.desc);
            boolean isStatic = (mn.access & Opcodes.ACC_STATIC) != 0;
            String[] paramNames = new String[argTypes.length];
            int slot = isStatic ? 0 : 1;
            for (int i = 0; i < argTypes.length; i++) {
                String name = "arg" + i;
                if (mn.localVariables != null) {
                    for (LocalVariableNode var : mn.localVariables) {
                        if (var.index == slot) {
                            name = var.name;
                            break;
                        }
                    }
                }
                paramNames[i] = name;
                slot += argTypes[i].getSize();
            }

            InsnList paramsList = new InsnList();
            paramsList.add(new IntInsnNode(Opcodes.BIPUSH, argTypes.length));
            paramsList.add(new TypeInsnNode(Opcodes.ANEWARRAY, "java/lang/Object"));
            slot = isStatic ? 0 : 1;
            for (int i = 0; i < argTypes.length; i++) {
                paramsList.add(new InsnNode(Opcodes.DUP));
                paramsList.add(new IntInsnNode(Opcodes.BIPUSH, i));
                addLoadAndBox(paramsList, slot, argTypes[i].getDescriptor());
                paramsList.add(new InsnNode(Opcodes.AASTORE));
                slot += argTypes[i].getSize();
            }

            InsnList namesList = new InsnList();
            namesList.add(new IntInsnNode(Opcodes.BIPUSH, argTypes.length));
            namesList.add(new TypeInsnNode(Opcodes.ANEWARRAY, "java/lang/String"));
            for (int i = 0; i < argTypes.length; i++) {
                namesList.add(new InsnNode(Opcodes.DUP));
                namesList.add(new IntInsnNode(Opcodes.BIPUSH, i));
                namesList.add(new LdcInsnNode(paramNames[i]));
                namesList.add(new InsnNode(Opcodes.AASTORE));
            }

            InsnList enterList = new InsnList();
            enterList.add(new LdcInsnNode(className));
            enterList.add(new LdcInsnNode(mn.name));
            enterList.add(new IntInsnNode(Opcodes.SIPUSH, currentLine));
            enterList.add(paramsList);
            enterList.add(namesList);
            enterList.add(new MethodInsnNode(Opcodes.INVOKESTATIC,
                "com/jiv/agent/listeners/JivRuntime",
                "onMethodEnter",
                "(Ljava/lang/String;Ljava/lang/String;I[Ljava/lang/Object;[Ljava/lang/String;)V",
                false));
            mn.instructions.insertBefore(insertEnterPoint, enterList);
        }

        int superCallIdx = -1;
        if (mn.name.equals("<init>")) {
            for (int k = 0; k < insns.length; k++) {
                if (insns[k].getOpcode() == Opcodes.INVOKESPECIAL) {
                    MethodInsnNode min = (MethodInsnNode) insns[k];
                    if (min.name.equals("<init>")) {
                        superCallIdx = mn.instructions.indexOf(insns[k]);
                        break;
                    }
                }
            }
        }

        for (AbstractInsnNode insn : insns) {
            if (insn instanceof LineNumberNode lnn) {
                currentLine = lnn.line;

                InsnList captureList = new InsnList();
                if (mn.localVariables != null) {
                    int insnIdx = mn.instructions.indexOf(lnn);
                    for (LocalVariableNode var : mn.localVariables) {
                        int startIdx = mn.instructions.indexOf(var.start);
                        int endIdx = mn.instructions.indexOf(var.end);
                        if (insnIdx >= startIdx && insnIdx < endIdx) {
                            if (var.name.equals("this")) {
                                continue;
                            }
                            if (mn.name.equals("<init>") && insnIdx <= superCallIdx) {
                                continue;
                            }

                            captureList.add(new LdcInsnNode(var.name));
                            addLoadAndBox(captureList, var);
                            captureList.add(new MethodInsnNode(Opcodes.INVOKESTATIC,
                                "com/jiv/agent/listeners/JivRuntime",
                                "setLocal",
                                "(Ljava/lang/String;Ljava/lang/Object;)V",
                                false));
                        }
                    }
                }

                captureList.add(new LdcInsnNode(className));
                captureList.add(new LdcInsnNode(mn.name));
                captureList.add(new IntInsnNode(Opcodes.SIPUSH, lnn.line));
                captureList.add(new MethodInsnNode(Opcodes.INVOKESTATIC,
                    "com/jiv/agent/listeners/JivRuntime",
                    "onLineChange",
                    "(Ljava/lang/String;Ljava/lang/String;I)V",
                    false));

                mn.instructions.insertBefore(lnn, captureList);

            } else if (isExitInstruction(insn)) {

                InsnList exitList = new InsnList();
                exitList.add(new LdcInsnNode(className));
                exitList.add(new LdcInsnNode(mn.name));
                exitList.add(new IntInsnNode(Opcodes.SIPUSH, currentLine));
                exitList.add(new MethodInsnNode(Opcodes.INVOKESTATIC,
                    "com/jiv/agent/listeners/JivRuntime",
                    "onMethodExit",
                    "(Ljava/lang/String;Ljava/lang/String;I)V",
                    false));
                mn.instructions.insertBefore(insn, exitList);
            }
        }
    }

    private boolean isExitInstruction(AbstractInsnNode insn) {
        int opcode = insn.getOpcode();
        return (opcode >= Opcodes.IRETURN && opcode <= Opcodes.RETURN) || opcode == Opcodes.ATHROW;
    }

    private void addLoadAndBox(InsnList il, LocalVariableNode var) {
        addLoadAndBox(il, var.index, var.desc);
    }

    private void addLoadAndBox(InsnList il, int index, String desc) {
        if (desc.equals("Z")) {
            il.add(new VarInsnNode(Opcodes.ILOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Boolean", "valueOf", "(Z)Ljava/lang/Boolean;", false));
        } else if (desc.equals("C")) {
            il.add(new VarInsnNode(Opcodes.ILOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Character", "valueOf", "(C)Ljava/lang/Character;", false));
        } else if (desc.equals("B")) {
            il.add(new VarInsnNode(Opcodes.ILOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Byte", "valueOf", "(B)Ljava/lang/Byte;", false));
        } else if (desc.equals("S")) {
            il.add(new VarInsnNode(Opcodes.ILOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Short", "valueOf", "(S)Ljava/lang/Short;", false));
        } else if (desc.equals("I")) {
            il.add(new VarInsnNode(Opcodes.ILOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Integer", "valueOf", "(I)Ljava/lang/Integer;", false));
        } else if (desc.equals("J")) {
            il.add(new VarInsnNode(Opcodes.LLOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Long", "valueOf", "(J)Ljava/lang/Long;", false));
        } else if (desc.equals("F")) {
            il.add(new VarInsnNode(Opcodes.FLOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Float", "valueOf", "(F)Ljava/lang/Float;", false));
        } else if (desc.equals("D")) {
            il.add(new VarInsnNode(Opcodes.DLOAD, index));
            il.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "java/lang/Double", "valueOf", "(D)Ljava/lang/Double;", false));
        } else if (desc.startsWith("L") || desc.startsWith("[")) {
            il.add(new VarInsnNode(Opcodes.ALOAD, index));
        }
    }

    private static String getSimpleNameFromDesc(String desc) {
        if (desc == null || !desc.startsWith("L") || !desc.endsWith(";")) {
            return "";
        }
        String clean = desc.substring(1, desc.length() - 1);
        int slashIdx = clean.lastIndexOf('/');
        if (slashIdx == -1) {
            return clean;
        }
        return clean.substring(slashIdx + 1);
    }
}
