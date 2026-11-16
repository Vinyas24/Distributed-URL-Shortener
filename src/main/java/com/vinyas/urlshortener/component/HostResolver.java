package com.vinyas.urlshortener.component;

import java.net.InetAddress;
import java.net.UnknownHostException;

public interface HostResolver {

    InetAddress[] resolve(String host) throws UnknownHostException;
}
