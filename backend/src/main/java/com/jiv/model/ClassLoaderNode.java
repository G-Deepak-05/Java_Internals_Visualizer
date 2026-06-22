package com.jiv.model;

import lombok.Data;
import java.util.List;
import java.util.ArrayList;

@Data
public class ClassLoaderNode {
    private String name;
    private String parentName;
    private List<String> loadedClasses = new ArrayList<>();
}
